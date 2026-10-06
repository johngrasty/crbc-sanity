// Loaded with node --import before every test file. Tests run offline: a network connection, a
// UDP packet or a DNS lookup fails the run, even when the code under test catches the error.
// Unix sockets and named pipes stay open, because they're local IPC, not network.
import dgram from 'node:dgram'
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

const connect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0]
  const ipc = typeof options === 'string' || (typeof options === 'object' && options?.path)
  if (ipc) return connect.apply(this, args)
  const host =
    typeof options === 'object' ? (options.host ?? 'localhost') : (args[1] ?? 'localhost')
  const port = typeof options === 'object' ? options.port : options
  const error = blocked(`${host}:${port}`)
  process.nextTick(() => this.destroy(error))
  return this
}

dgram.Socket.prototype.send = function () {
  throw blocked('a UDP address')
}

dns.lookup = (hostname, ...args) => {
  const callback = args.at(-1)
  const error = blocked(hostname)
  process.nextTick(() => callback(error))
}
dns.promises.lookup = async (hostname) => {
  throw blocked(hostname)
}

syncBuiltinESMExports()
