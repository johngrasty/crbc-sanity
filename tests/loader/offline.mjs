// Loaded with node --import before every test file, and into every worker those tests start.
// Tests run offline: a network connection, a UDP packet or a DNS query fails the run, even when
// the code under test catches the error. Unix sockets and named pipes stay open, because they're
// local IPC, not network. The guard catches accidental network use. It isn't a sandbox against
// code written to get around it. tests/offline-guard.test.ts checks each kind of attempt from a
// child process.
import {randomUUID} from 'node:crypto'
import dns from 'node:dns'
import {appendFileSync, existsSync, rmSync} from 'node:fs'
import {syncBuiltinESMExports} from 'node:module'
import net from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import workerThreads from 'node:worker_threads'

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

// Every worker gets the guard. A worker started from a file or URL runs --import preloads, so
// the guard's --import goes in front of the worker's own arguments, inherited or given, such as
// execArgv: []. An eval worker never runs preloads, so its code loads the guard first: a static
// import when --input-type=module makes the code a module, else a require after any
// 'use strict' directive. Workers also get the report file in their environment.
const guardUrl = import.meta.url
const strictDirective = /^\s*(['"])use strict\1;?/

function loadGuardFirst(code, execArgv) {
  const moduleCode = execArgv.some(
    (arg, index) =>
      arg === '--input-type=module' || (arg === '--input-type' && execArgv[index + 1] === 'module'),
  )
  if (moduleCode) return `import ${JSON.stringify(guardUrl)};${code}`
  const directive = code.match(strictDirective)?.[0] ?? ''
  const load = `require(${JSON.stringify(fileURLToPath(guardUrl))});`
  return directive + load + code.slice(directive.length)
}

const BaseWorker = workerThreads.Worker
workerThreads.Worker = class Worker extends BaseWorker {
  constructor(filename, options = {}) {
    const execArgv = ['--import', guardUrl, ...(options.execArgv ?? process.execArgv)]
    const env =
      typeof options.env === 'object' && options.env !== null
        ? {...options.env, [REPORT]: process.env[REPORT]}
        : options.env
    const entry = options.eval ? loadGuardFirst(String(filename), execArgv) : filename
    super(entry, {...options, execArgv, env})
  }
}

syncBuiltinESMExports()
