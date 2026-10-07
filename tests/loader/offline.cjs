// The offline guard. npm test loads it with node --require before every test file, and it loads
// itself into every worker those tests start. It's CommonJS and synchronous, because Node runs
// --require preloads before --import preloads and before any test code, so nothing a test or
// its setup modules load can reach the network before the guard is in place.
//
// Tests run offline: a network connection, a UDP packet or a DNS query fails the run, even when
// the code under test catches the error. Unix sockets and named pipes stay open, because they're
// local IPC, not network. The guard catches accidental network use. It isn't a sandbox against
// code written to get around it. tests/offline-guard.test.ts checks each kind of attempt from a
// child process.
'use strict'

const {randomUUID} = require('node:crypto')
const dns = require('node:dns')
const {appendFileSync, existsSync, rmSync} = require('node:fs')
const {syncBuiltinESMExports} = require('node:module')
const net = require('node:net')
const {tmpdir} = require('node:os')
const {join} = require('node:path')
const process = require('node:process')
const workerThreads = require('node:worker_threads')

const guardFile = require.resolve('./offline.cjs')

// A worker's exit code ends only that worker, so a worker reports a blocked attempt by appending
// to the file this variable names, and the main thread fails the process on exit when the file
// exists. The exit listener also covers the main thread's own blocks, so a later process.exit(0)
// can't clear them. Each process's main thread names its own file, so a child process never
// reports to its parent.
const REPORT = 'OFFLINE_GUARD_REPORT'
let blockedHere = false
if (workerThreads.isMainThread) {
  const report = join(tmpdir(), `offline-guard-${process.pid}-${randomUUID()}`)
  process.env[REPORT] = report
  process.on('exit', () => {
    const fromWorker = existsSync(report)
    rmSync(report, {force: true})
    if (fromWorker) {
      process.stderr.write('A worker thread tried to reach the network. Its message is above.\n')
    }
    if (blockedHere || fromWorker) process.exitCode = 1
  })
}

function blocked(target) {
  const error = new Error(`Tests run offline, but something tried to reach ${target}`)
  error.code = 'ERR_TESTS_OFFLINE'
  process.stderr.write(`${error.stack}\n`)
  blockedHere = true
  process.exitCode = 1
  if (!workerThreads.isMainThread && process.env[REPORT]) {
    appendFileSync(process.env[REPORT], `${target}\n`)
  }
  return error
}

// TCP and UDP are blocked at the native handles, which every net, tls, http, fetch and dgram call
// reaches after Node has normalized its arguments, so no overload gets around the guard. A
// blocked call returns libuv's ENETUNREACH, and net and dgram report it as an ordinary connect or
// send error. The pipe handle, which carries Unix sockets and named pipes, is left alone.
const {UV_ENETUNREACH} = process.binding('uv')
const {TCP} = process.binding('tcp_wrap')
const {UDP} = process.binding('udp_wrap')

for (const name of ['connect', 'connect6']) {
  // connect(request, address, port)
  TCP.prototype[name] = function (request, address, port) {
    blocked(`${address}:${port} over TCP`)
    return UV_ENETUNREACH
  }
}
for (const name of ['send', 'send6']) {
  // send(request, buffers, count, port, address, hasCallback), or on a connected socket
  // send(request, buffers, count, hasCallback)
  UDP.prototype[name] = function (request, buffers, count, port, address) {
    blocked(typeof port === 'number' ? `${address}:${port} over UDP` : 'a connected UDP peer')
    return UV_ENETUNREACH
  }
}

// The native DNS entry points under the public API: c-ares queries and reverse lookups on
// ChannelWrap, and the operating system's getaddrinfo and getnameinfo. Node's own dns module
// keeps its own references to these, so the public functions are denied separately below.
const cares = process.binding('cares_wrap')
for (const name of Object.getOwnPropertyNames(cares.ChannelWrap.prototype)) {
  if (!name.startsWith('query') && name !== 'getHostByAddr') continue
  // queryA(request, hostname), getHostByAddr(request, address)
  cares.ChannelWrap.prototype[name] = function (request, target) {
    blocked(`DNS ${name} ${target}`)
    return UV_ENETUNREACH
  }
}
for (const name of ['getaddrinfo', 'getnameinfo']) {
  // getaddrinfo(request, hostname, family, hints, order), getnameinfo(request, address, port)
  cares[name] = function (request, target) {
    blocked(`DNS ${name} ${target}`)
    return UV_ENETUNREACH
  }
}

// Every public DNS function is denied before Node's resolver runs: lookup, lookupService,
// reverse and each resolve method, on the callback and promise modules, and on both Resolver
// classes, whose instances don't go through the module functions. A callback gets the error, and
// a promise rejects with it. Node answers a lookup of an IP literal itself, without the resolver,
// and listen() and bind() look up the address they're given, so those lookups pass.
const isDnsCall = (name) =>
  name === 'lookup' || name === 'lookupService' || name === 'reverse' || name.startsWith('resolve')

function denyDns(target, {promises}) {
  for (const name of Object.getOwnPropertyNames(target).filter(isDnsCall)) {
    const original = target[name]
    target[name] = function (hostname, ...args) {
      if (name === 'lookup' && net.isIP(hostname)) return original.call(this, hostname, ...args)
      const error = blocked(`DNS ${name} ${hostname}`)
      if (promises) return Promise.reject(error)
      const callback = args.at(-1)
      if (typeof callback === 'function') process.nextTick(callback, error)
      return undefined
    }
  }
}
denyDns(dns, {promises: false})
denyDns(dns.Resolver.prototype, {promises: false})
denyDns(dns.promises, {promises: true})
denyDns(dns.promises.Resolver.prototype, {promises: true})

// Every worker gets the guard first. Workers run --require preloads in the order given, before
// --import preloads and the worker's code, including eval workers, which skip --import. So the
// guard goes first among the worker's own arguments, inherited or given, such as execArgv: [].
// A worker also applies NODE_OPTIONS from its environment before those arguments, so the guard
// goes first there too: in a copied environment that has NODE_OPTIONS, and, for SHARE_ENV, in
// this process's own NODE_OPTIONS, which the worker shares. The main process reads NODE_OPTIONS
// only at startup, so changing it here affects only workers and child processes started later.
// Workers also get the report file in their environment. SHARE_ENV already has it.
const guardOption = `--require ${JSON.stringify(guardFile)}`
const guardFirst = (options) =>
  options.startsWith(guardOption) ? options : `${guardOption} ${options}`

function workerEnv(env) {
  if (typeof env === 'symbol') {
    if (process.env.NODE_OPTIONS) process.env.NODE_OPTIONS = guardFirst(process.env.NODE_OPTIONS)
    return env
  }
  const copy = {...(env ?? process.env), [REPORT]: process.env[REPORT]}
  if (copy.NODE_OPTIONS) copy.NODE_OPTIONS = guardFirst(copy.NODE_OPTIONS)
  return copy
}

const BaseWorker = workerThreads.Worker
workerThreads.Worker = class Worker extends BaseWorker {
  constructor(filename, options = {}) {
    const execArgv = ['--require', guardFile, ...(options.execArgv ?? process.execArgv)]
    super(filename, {...options, execArgv, env: workerEnv(options.env)})
  }
}

syncBuiltinESMExports()
