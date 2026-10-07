// Loaded with node --import before every test file. Tests run offline: a network connection, a
// UDP packet or a DNS query fails the run, even when the code under test catches the error.
// Unix sockets and named pipes stay open, because they're local IPC, not network.
// tests/offline-guard.test.ts checks each kind of attempt from a child process.
import dns from 'node:dns'
import {syncBuiltinESMExports} from 'node:module'
import net from 'node:net'
import process from 'node:process'

function blocked(target) {
  const error = new Error(`Tests run offline, but something tried to reach ${target}`)
  error.code = 'ERR_TESTS_OFFLINE'
  process.stderr.write(`${error.stack}\n`)
  process.exitCode = 1
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

// Every DNS function is denied before Node's native resolver runs: lookup, lookupService,
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

syncBuiltinESMExports()
