// The offline guard in tests/loader/offline.cjs, checked from outside. Each case runs a child
// process that makes one network attempt and catches the error, as Sanity's getCurrentUser does.
// Without the guard, the attempt reaches a receiver in this process, which shows the receiver
// works. With the guard, the child exits nonzero and nothing arrives. The receivers listen on
// 127.0.0.1 and ::1, and DNS cases point the resolver at the UDP receiver, so nothing leaves the
// machine.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import dgram from 'node:dgram'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import net from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {after, before, test} from 'node:test'
import {setTimeout as wait} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'

const guard = fileURLToPath(new URL('./loader/offline.cjs', import.meta.url))

// Children run from files here rather than with -e, because a worker inherits its process's
// arguments, and -e with --input-type would break it.
const scratch = mkdtempSync(join(tmpdir(), 'offline-guard-'))
let children = 0
const setupModule = join(scratch, 'worker-setup.cjs')

let hits = 0
const ports: Record<string, number> = {}
const receive = () => hits++
const tcp = net.createServer((socket) => {
  hits++
  socket.destroy()
})
const tcp6 = net.createServer((socket) => {
  hits++
  socket.destroy()
})
const udp = dgram.createSocket('udp4').on('message', receive)
const udp6 = dgram.createSocket('udp6').on('message', receive)

before(async () => {
  await new Promise<void>((resolve) => tcp.listen(0, '127.0.0.1', resolve))
  await new Promise<void>((resolve) => tcp6.listen(0, '::1', resolve))
  await new Promise<void>((resolve) => udp.bind(0, '127.0.0.1', resolve))
  await new Promise<void>((resolve) => udp6.bind(0, '::1', resolve))
  ports.PORT = (tcp.address() as net.AddressInfo).port
  ports.PORT6 = (tcp6.address() as net.AddressInfo).port
  ports.UDP = udp.address().port
  ports.UDP6 = udp6.address().port
  // A worker setup module that connects to the TCP receiver, for the preload cases.
  writeFileSync(
    setupModule,
    `require('node:net').connect(${ports.PORT}, '127.0.0.1').on('error', () => {})\n`,
  )
})
after(() => {
  tcp.close()
  tcp6.close()
  udp.close()
  udp6.close()
  rmSync(scratch, {recursive: true, force: true})
})

// Puts the receivers' ports in place of PORT, PORT6, UDP and UDP6, and the setup module's path,
// as a string literal, in place of SETUP.
const withPorts = (code: string) =>
  code.replaceAll(/\b(PORT6|PORT|UDP6|UDP|SETUP)\b/g, (name) =>
    name === 'SETUP' ? JSON.stringify(setupModule) : String(ports[name]),
  )

// Runs code in a child process, with or without the guard, and reports its exit status and how
// many connections and packets the receivers saw. The child exits after half a second at most,
// so a DNS query nobody answers doesn't hang it.
async function attempt(
  code: string,
  {guarded, before = []}: {guarded: boolean; before?: string[]},
) {
  hits = 0
  const source = `
    import dgram from 'node:dgram'
    import dns from 'node:dns'
    import net from 'node:net'
    import tls from 'node:tls'
    import {Worker} from 'node:worker_threads'
    const servers = ['127.0.0.1:${ports.UDP}']
    const inWorker = (body, options) =>
      new Worker(new URL('data:text/javascript,' + encodeURIComponent(body)), options)
        .on('error', () => {})
    setTimeout(() => process.exit(), 500).unref()
    ${code}
  `
  const file = join(scratch, `child-${++children}.mjs`)
  writeFileSync(file, source)
  const args = [...before, ...(guarded ? ['--require', guard] : []), file]
  const child = spawn(process.execPath, args, {stdio: ['ignore', 'ignore', 'pipe']})
  let stderr = ''
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const status = await new Promise<number | null>((resolve) => child.on('close', resolve))
  await wait(100)
  return {status, stderr, hits}
}

const ignore = '() => {}'
const cases: {name: string; code: string; observable: boolean}[] = [
  {name: 'TCP', code: `net.connect(PORT, '127.0.0.1').on('error', ${ignore})`, observable: true},
  {
    name: 'Socket.connect(String(port))',
    code: `new net.Socket().connect(String(PORT), '127.0.0.1').on('error', ${ignore})`,
    observable: true,
  },
  {name: 'IPv6 TCP', code: `net.connect(PORT6, '::1').on('error', ${ignore})`, observable: true},
  {
    name: 'TLS',
    code: `tls.connect(PORT, '127.0.0.1', {rejectUnauthorized: false}).on('error', ${ignore})`,
    observable: true,
  },
  {name: 'fetch', code: `fetch('http://127.0.0.1:PORT').catch(${ignore})`, observable: true},
  {
    name: 'UDP',
    code: `try { dgram.createSocket('udp4').send('x', UDP, '127.0.0.1') } catch {}`,
    observable: true,
  },
  {
    name: 'IPv6 UDP',
    code: `try { dgram.createSocket('udp6').send('x', UDP6, '::1') } catch {}`,
    observable: true,
  },
  {name: 'lookup', code: `dns.lookup('localhost', ${ignore})`, observable: false},
  {
    name: 'promise lookup',
    code: `dns.promises.lookup('localhost').catch(${ignore})`,
    observable: false,
  },
  {
    name: 'lookupService',
    code: `dns.lookupService('127.0.0.1', 22, ${ignore})`,
    observable: false,
  },
  {
    name: 'resolve4',
    code: `dns.setServers(servers); dns.resolve4('guard.invalid', ${ignore})`,
    observable: true,
  },
  {
    name: 'resolve',
    code: `dns.setServers(servers); dns.resolve('guard.invalid', 'TXT', ${ignore})`,
    observable: true,
  },
  {
    name: 'promise resolve',
    code: `dns.promises.setServers(servers); dns.promises.resolve4('guard.invalid').catch(${ignore})`,
    observable: true,
  },
  {
    name: 'Resolver',
    code: `const r = new dns.Resolver(); r.setServers(servers); r.resolve4('guard.invalid', ${ignore})`,
    observable: true,
  },
  {
    name: 'promise Resolver',
    code: `const r = new dns.promises.Resolver(); r.setServers(servers); r.resolveTxt('guard.invalid').catch(${ignore})`,
    observable: true,
  },
  {
    name: 'reverse',
    code: `dns.setServers(servers); dns.reverse('192.0.2.1', ${ignore})`,
    observable: true,
  },
  {
    name: 'promise reverse',
    code: `dns.promises.setServers(servers); dns.promises.reverse('192.0.2.1').catch(${ignore})`,
    observable: true,
  },
  {
    name: 'native c-ares query',
    code: `const {ChannelWrap, QueryReqWrap} = process.binding('cares_wrap')
      const channel = new ChannelWrap(500, 1, 0)
      channel.setServers([[4, '127.0.0.1', UDP]])
      const request = new QueryReqWrap()
      request.oncomplete = ${ignore}
      channel.queryA(request, 'guard.invalid')`,
    observable: true,
  },
  {
    name: 'native c-ares reverse',
    code: `const {ChannelWrap, QueryReqWrap} = process.binding('cares_wrap')
      const channel = new ChannelWrap(500, 1, 0)
      channel.setServers([[4, '127.0.0.1', UDP]])
      const request = new QueryReqWrap()
      request.oncomplete = ${ignore}
      channel.getHostByAddr(request, '192.0.2.1')`,
    observable: true,
  },
  {
    name: 'native getaddrinfo',
    code: `const {getaddrinfo, GetAddrInfoReqWrap} = process.binding('cares_wrap')
      const request = new GetAddrInfoReqWrap()
      request.oncomplete = ${ignore}
      getaddrinfo(request, 'localhost', 0, 0, 0)`,
    observable: false,
  },
  {
    name: 'native getnameinfo',
    code: `const {getnameinfo, GetNameInfoReqWrap} = process.binding('cares_wrap')
      const request = new GetNameInfoReqWrap()
      request.oncomplete = ${ignore}
      getnameinfo(request, '127.0.0.1', 22)`,
    observable: false,
  },
  {
    name: 'worker with inherited arguments',
    code: `inWorker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {})")`,
    observable: true,
  },
  {
    name: 'worker with execArgv: []',
    code: `inWorker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {})", {execArgv: []})`,
    observable: true,
  },
  {
    name: 'eval worker',
    code: `new Worker("require('node:net').connect(PORT, '127.0.0.1').on('error', () => {})", {eval: true}).on('error', ${ignore})`,
    observable: true,
  },
  {
    name: 'module eval worker',
    code: `new Worker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {})", {eval: true, execArgv: ['--input-type=module']}).on('error', ${ignore})`,
    observable: true,
  },
  {
    name: 'worker setup module loaded with --require',
    code: `inWorker('0', {execArgv: ['--require', SETUP]})`,
    observable: true,
  },
  {
    name: "worker setup module in the worker's NODE_OPTIONS",
    code: `inWorker('0', {env: {...process.env, NODE_OPTIONS: '--require ' + JSON.stringify(SETUP)}})`,
    observable: true,
  },
]

for (const {name, code, observable} of cases) {
  test(`the offline guard fails a caught ${name} attempt and sends nothing`, async () => {
    if (observable) {
      const open = await attempt(withPorts(code), {guarded: false})
      assert.ok(open.hits > 0, `without the guard, ${name} should reach the receiver`)
    }
    const guarded = await attempt(withPorts(code), {guarded: true})
    assert.notEqual(guarded.status, 0, `the child should fail. stderr: ${guarded.stderr}`)
    assert.match(guarded.stderr, /Tests run offline/)
    assert.equal(guarded.hits, 0, `${name} reached the receiver through the guard`)
  })
}

test('the offline guard leaves Unix sockets open, because they are local IPC', async () => {
  const path = join(scratch, 'ipc.sock')
  const server = net.createServer((socket) => {
    hits++
    socket.end()
  })
  await new Promise<void>((resolve) => server.listen(path, resolve))
  try {
    const code = `net.connect(${JSON.stringify(path)}).on('connect', () => process.exit(0))`
    const result = await attempt(code, {guarded: true})
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.hits, 1)
  } finally {
    server.close()
  }
})

test('the guard runs before a preload listed ahead of it on the command line', async () => {
  // Node runs --require preloads before --import preloads, whatever their order.
  const before = ['--import', setupModule]
  const open = await attempt('0', {guarded: false, before})
  assert.ok(open.hits > 0, 'without the guard, the setup module should reach the receiver')
  const guarded = await attempt('0', {guarded: true, before})
  assert.notEqual(guarded.status, 0, `the child should fail. stderr: ${guarded.stderr}`)
  assert.match(guarded.stderr, /Tests run offline/)
  assert.equal(guarded.hits, 0, 'the setup module reached the receiver through the guard')
})

test("an eval worker whose 'use strict' has no semicolon still runs, with or without the guard", async () => {
  const code = `
    const source = "'use strict'\\nrequire('node:worker_threads').parentPort.postMessage(42)"
    let message
    new Worker(source, {eval: true, execArgv: []})
      .on('message', (value) => (message = value))
      .on('error', (error) => console.error(error))
      .on('exit', (code) => process.exit(code === 0 && message === 42 ? 0 : 3))
  `
  for (const guarded of [false, true]) {
    const result = await attempt(code, {guarded})
    assert.equal(result.status, 0, `guarded: ${guarded}. stderr: ${result.stderr}`)
  }
})
