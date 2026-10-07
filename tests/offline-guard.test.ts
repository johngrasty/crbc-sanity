// The offline guard in tests/loader/offline.cjs, checked from outside. Each case runs a child
// process that makes one network attempt and catches the error, as Sanity's getCurrentUser does.
// Without the guard, the attempt reaches a receiver in this process, which shows the receiver
// works. With the guard, the child exits nonzero and nothing arrives. The receivers listen on
// 127.0.0.1 and ::1, and DNS cases point the resolver at the UDP receiver, so nothing leaves the
// machine. Each attempt carries its own marker, and the receivers count only data that holds it.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {randomInt} from 'node:crypto'
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
const dnsSetupModule = join(scratch, 'dns-setup.cjs')
// What the setup modules hold. Each attempt writes them with its own marker. The first is a worker
// setup module that sends the marker to the TCP receiver, for the preload cases. The second makes
// a DNS query as soon as it loads, so a guard that loads after it is too late.
const setupSources = {
  [setupModule]: `require('node:net').connect(PORT, '127.0.0.1').on('error', () => {}).end('MARK')\n`,
  [dnsSetupModule]: `const dns = require('node:dns')
dns.setServers(['127.0.0.1:UDP'])
dns.resolve4('MARK.invalid', () => {})\n`,
}

// Each attempt's marker looks like an IPv4 address, such as 203.117.158.141, so a reverse lookup
// can carry it too. The child puts the marker in everything it sends: the TCP payload, the UDP
// datagram or the DNS query name. A late packet from an earlier attempt, or another process that
// lands on a receiver's port, doesn't carry it, so it doesn't count. Every octet has three digits,
// so no marker reads as part of another, or of 127.0.0.1.
let marker = ''
let hits = 0
const ports: Record<string, number> = {}
// A DNS query name goes out as labels, each led by a length byte, so control bytes read as dots.
const text = (data: Buffer) => data.toString('latin1').replaceAll(/\p{Cc}/gu, '.')
const receive = (data: Buffer) => {
  if (text(data).includes(marker)) hits++
}
// A TCP receiver collects what arrives, since the marker could come in more than one chunk. A peer
// that resets its connection isn't a failure here, so socket errors are ignored.
const receiveTcp = (socket: net.Socket) => {
  const chunks: Buffer[] = []
  socket.on('error', () => undefined)
  socket.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
    if (!text(Buffer.concat(chunks)).includes(marker)) return
    hits++
    socket.destroy()
  })
}
const tcp = net.createServer(receiveTcp)
const tcp6 = net.createServer(receiveTcp)
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
})
after(() => {
  tcp.close()
  tcp6.close()
  udp.close()
  udp6.close()
  rmSync(scratch, {recursive: true, force: true})
})

// Puts the receivers' ports in place of PORT, PORT6, UDP and UDP6, the current marker in place of
// MARK, and the setup modules' paths, as string literals, in place of SETUP and DNS_SETUP.
const setupPaths: Record<string, string> = {SETUP: setupModule, DNS_SETUP: dnsSetupModule}
const fillIn = (code: string) =>
  code.replaceAll(/\b(PORT6|PORT|UDP6|UDP|MARK|SETUP|DNS_SETUP)\b/g, (name) => {
    if (name === 'MARK') return marker
    return name in setupPaths ? JSON.stringify(setupPaths[name]) : String(ports[name])
  })

// Runs code in a child process, with or without the guard, under a new marker, and reports its
// exit status, the marker, and how many connections and packets carried that marker to the
// receivers. The child exits after half a second at most, so a DNS query nobody answers doesn't
// hang it.
async function attempt(
  code: string,
  {guarded, before = []}: {guarded: boolean; before?: string[]},
) {
  marker = Array.from({length: 4}, () => randomInt(100, 256)).join('.')
  hits = 0
  for (const [path, source] of Object.entries(setupSources)) writeFileSync(path, fillIn(source))
  const source = fillIn(`
    import dgram from 'node:dgram'
    import dns from 'node:dns'
    import net from 'node:net'
    import tls from 'node:tls'
    import {SHARE_ENV, Worker} from 'node:worker_threads'
    const servers = ['127.0.0.1:UDP']
    const reversed = (address) => address.split('.').reverse().join('.')
    const inWorker = (body, options) =>
      new Worker(new URL('data:text/javascript,' + encodeURIComponent(body)), options)
        .on('error', () => {})
    setTimeout(() => process.exit(), 500).unref()
    ${code}
  `)
  const file = join(scratch, `child-${++children}.mjs`)
  writeFileSync(file, source)
  const args = [...before, ...(guarded ? ['--require', guard] : []), file]
  const child = spawn(process.execPath, args, {stdio: ['ignore', 'ignore', 'pipe']})
  let stderr = ''
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const status = await new Promise<number | null>((resolve) => child.on('close', resolve))
  await wait(100)
  return {status, stderr, marker, hits}
}

const ignore = '() => {}'
const cases: {name: string; code: string; observable: boolean}[] = [
  {
    name: 'TCP',
    code: `net.connect(PORT, '127.0.0.1').on('error', ${ignore}).end('MARK')`,
    observable: true,
  },
  {
    name: 'Socket.connect(String(port))',
    code: `new net.Socket().connect(String(PORT), '127.0.0.1').on('error', ${ignore}).end('MARK')`,
    observable: true,
  },
  {
    name: 'IPv6 TCP',
    code: `net.connect(PORT6, '::1').on('error', ${ignore}).end('MARK')`,
    observable: true,
  },
  {
    name: 'TLS',
    // The TLS handshake names the server in plain text, so the server name carries the marker.
    code: `tls.connect(PORT, '127.0.0.1', {rejectUnauthorized: false, servername: 'MARK.invalid'}).on('error', ${ignore})`,
    observable: true,
  },
  {name: 'fetch', code: `fetch('http://127.0.0.1:PORT/MARK').catch(${ignore})`, observable: true},
  {
    name: 'UDP',
    code: `try { dgram.createSocket('udp4').send('MARK', UDP, '127.0.0.1') } catch {}`,
    observable: true,
  },
  {
    name: 'IPv6 UDP',
    code: `try { dgram.createSocket('udp6').send('MARK', UDP6, '::1') } catch {}`,
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
    code: `dns.setServers(servers); dns.resolve4('MARK.invalid', ${ignore})`,
    observable: true,
  },
  {
    name: 'resolve',
    code: `dns.setServers(servers); dns.resolve('MARK.invalid', 'TXT', ${ignore})`,
    observable: true,
  },
  {
    name: 'promise resolve',
    code: `dns.promises.setServers(servers); dns.promises.resolve4('MARK.invalid').catch(${ignore})`,
    observable: true,
  },
  {
    name: 'Resolver',
    code: `const r = new dns.Resolver(); r.setServers(servers); r.resolve4('MARK.invalid', ${ignore})`,
    observable: true,
  },
  {
    name: 'promise Resolver',
    code: `const r = new dns.promises.Resolver(); r.setServers(servers); r.resolveTxt('MARK.invalid').catch(${ignore})`,
    observable: true,
  },
  // A reverse lookup asks for the address's octets in reverse order, so the query name for
  // reversed('MARK') carries the marker.
  {
    name: 'reverse',
    code: `dns.setServers(servers); dns.reverse(reversed('MARK'), ${ignore})`,
    observable: true,
  },
  {
    name: 'promise reverse',
    code: `dns.promises.setServers(servers); dns.promises.reverse(reversed('MARK')).catch(${ignore})`,
    observable: true,
  },
  {
    name: 'native c-ares query',
    code: `const {ChannelWrap, QueryReqWrap} = process.binding('cares_wrap')
      const channel = new ChannelWrap(500, 1, 0)
      channel.setServers([[4, '127.0.0.1', UDP]])
      const request = new QueryReqWrap()
      request.oncomplete = ${ignore}
      channel.queryA(request, 'MARK.invalid')`,
    observable: true,
  },
  {
    name: 'native c-ares reverse',
    code: `const {ChannelWrap, QueryReqWrap} = process.binding('cares_wrap')
      const channel = new ChannelWrap(500, 1, 0)
      channel.setServers([[4, '127.0.0.1', UDP]])
      const request = new QueryReqWrap()
      request.oncomplete = ${ignore}
      channel.getHostByAddr(request, reversed('MARK'))`,
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
    code: `inWorker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {}).end('MARK')")`,
    observable: true,
  },
  {
    name: 'worker with execArgv: []',
    code: `inWorker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {}).end('MARK')", {execArgv: []})`,
    observable: true,
  },
  {
    name: 'eval worker',
    code: `new Worker("require('node:net').connect(PORT, '127.0.0.1').on('error', () => {}).end('MARK')", {eval: true}).on('error', ${ignore})`,
    observable: true,
  },
  {
    name: 'module eval worker',
    code: `new Worker("import net from 'node:net'; net.connect(PORT, '127.0.0.1').on('error', () => {}).end('MARK')", {eval: true, execArgv: ['--input-type=module']}).on('error', ${ignore})`,
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
  {
    name: 'SHARE_ENV worker with NODE_OPTIONS set by the test',
    code: `process.env.NODE_OPTIONS = '--require ' + JSON.stringify(DNS_SETUP)
      inWorker('0', {env: SHARE_ENV, execArgv: []})`,
    observable: true,
  },
]

for (const {name, code, observable} of cases) {
  test(`the offline guard fails a caught ${name} attempt and sends nothing`, async () => {
    if (observable) {
      const open = await attempt(code, {guarded: false})
      assert.ok(open.hits > 0, `without the guard, ${name} should reach the receiver`)
    }
    const guarded = await attempt(code, {guarded: true})
    assert.notEqual(guarded.status, 0, `the child should fail. stderr: ${guarded.stderr}`)
    assert.match(guarded.stderr, /Tests run offline/)
    assert.equal(guarded.hits, 0, `${name} reached the receiver through the guard`)
  })
}

test("the receivers count only traffic that carries the current attempt's marker", async () => {
  // This process runs under the guard, so an unguarded child sends the stray traffic: a stray
  // connection and packet to each receiver, the same again carrying the earlier attempt's marker,
  // as a late packet would, and then the current marker once to each receiver.
  const earlier = await attempt('0', {guarded: false})
  const code = `
    const send = (payload) => {
      net.connect(PORT, '127.0.0.1').on('error', ${ignore}).end(payload)
      net.connect(PORT6, '::1').on('error', ${ignore}).end(payload)
      dgram.createSocket('udp4').send(payload, UDP, '127.0.0.1')
      dgram.createSocket('udp6').send(payload, UDP6, '::1')
    }
    send('stray')
    send('${earlier.marker}')
    send('MARK')
  `
  const result = await attempt(code, {guarded: false})
  assert.equal(result.hits, 4, 'only the traffic that carries the current marker should count')
})

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
  // Node runs --require preloads before --import preloads, whatever their order. The setup
  // module's DNS query reaches the native resolver as it loads, so a guard loaded after it fails.
  const before = ['--import', dnsSetupModule]
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
