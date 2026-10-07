// The offline guard in tests/loader/offline.cjs, checked from outside. Each case runs a child
// process that makes one network attempt and catches the error, as Sanity's getCurrentUser does.
// Without the guard, the attempt reaches a receiver in this process, which shows the receiver
// works. With the guard, the child exits nonzero and no connection or packet reaches the
// attempt's receivers. The receivers listen on 127.0.0.1 and ::1, and DNS cases point the
// resolver at the UDP receiver, so nothing leaves the machine.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import dgram from 'node:dgram'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import net from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {after, test} from 'node:test'
import {setTimeout as wait} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'

const guard = fileURLToPath(new URL('./loader/offline.cjs', import.meta.url))

// Children run from files here rather than with -e, because a worker inherits its process's
// arguments, and -e with --input-type would break it.
const scratch = mkdtempSync(join(tmpdir(), 'offline-guard-'))
let children = 0
const setupModule = join(scratch, 'worker-setup.cjs')
const dnsSetupModule = join(scratch, 'dns-setup.cjs')

// What the setup modules hold. Each attempt writes them with its own receivers' ports. The first
// is a worker setup module that connects to the TCP receiver, for the preload cases. The second
// makes a DNS query that reaches the native resolver as soon as it loads, so a guard that loads
// after it is too late.
const setupSources = {
  [setupModule]: `require('node:net').connect(PORT, '127.0.0.1').on('error', () => {})\n`,
  [dnsSetupModule]: `const dns = require('node:dns')
dns.setServers(['127.0.0.1:UDP'])
dns.resolve4('guard.invalid', () => {})\n`,
}

// Each attempt gets its own receivers on fresh ports, and every receiver stays open until the
// end. A connection or packet that arrives late lands on the receivers of the attempt that sent
// it, so it can't count against a later attempt.
const receivers: (net.Server | dgram.Socket)[] = []
after(() => {
  for (const receiver of receivers) receiver.close()
  rmSync(scratch, {recursive: true, force: true})
})

type Counts = {tcp: number; tcp6: number; udp: number; udp6: number}

// Opens a set of receivers: TCP and UDP, on 127.0.0.1 and ::1. A TCP receiver counts every
// connection it accepts, even one that sends nothing, since a leaked connection might send
// nothing. It closes the connection at once, so no peer can hold it open. A UDP receiver counts
// every packet. The counts keep going after the attempt ends. Another process that happens to
// reach a fresh port counts too. That can fail a run, but it can't hide a leak.
async function openReceivers() {
  const counts: Counts = {tcp: 0, tcp6: 0, udp: 0, udp6: 0}
  const listen = (name: keyof Counts, host: string) =>
    new Promise<number>((resolve, reject) => {
      const server = net.createServer((socket) => {
        counts[name]++
        socket.destroy()
      })
      receivers.push(server)
      server.on('error', reject)
      server.listen(0, host, () => resolve((server.address() as net.AddressInfo).port))
    })
  const bind = (name: keyof Counts, type: dgram.SocketType, host: string) =>
    new Promise<number>((resolve, reject) => {
      const socket = dgram.createSocket(type).on('message', () => counts[name]++)
      receivers.push(socket)
      socket.on('error', reject)
      socket.bind(0, host, () => resolve(socket.address().port))
    })
  const ports: Record<string, number> = {
    PORT: await listen('tcp', '127.0.0.1'),
    PORT6: await listen('tcp6', '::1'),
    UDP: await bind('udp', 'udp4', '127.0.0.1'),
    UDP6: await bind('udp6', 'udp6', '::1'),
  }
  return {counts, ports}
}

// Puts the receivers' ports in place of PORT, PORT6, UDP and UDP6, and the setup modules' paths,
// as string literals, in place of SETUP and DNS_SETUP.
const setupPaths: Record<string, string> = {SETUP: setupModule, DNS_SETUP: dnsSetupModule}
const withPorts = (code: string, ports: Record<string, number>) =>
  code.replaceAll(/\b(PORT6|PORT|UDP6|UDP|SETUP|DNS_SETUP)\b/g, (name) =>
    name in setupPaths ? JSON.stringify(setupPaths[name]) : String(ports[name]),
  )

// Runs code in a child process, with or without the guard, against its own receivers, and
// reports its exit status, the receivers' ports, and how many connections and packets reached
// each receiver, with their total as hits. The child exits after half a second at most, so a DNS
// query nobody answers doesn't hang it.
async function attempt(
  code: string,
  {guarded, before = []}: {guarded: boolean; before?: string[]},
) {
  const {counts, ports} = await openReceivers()
  for (const [path, source] of Object.entries(setupSources)) {
    writeFileSync(path, withPorts(source, ports))
  }
  const source = withPorts(
    `
    import dgram from 'node:dgram'
    import dns from 'node:dns'
    import net from 'node:net'
    import tls from 'node:tls'
    import {SHARE_ENV, Worker} from 'node:worker_threads'
    const servers = ['127.0.0.1:UDP']
    const inWorker = (body, options) =>
      new Worker(new URL('data:text/javascript,' + encodeURIComponent(body)), options)
        .on('error', () => {})
    setTimeout(() => process.exit(), 500).unref()
    ${code}
  `,
    ports,
  )
  const file = join(scratch, `child-${++children}.mjs`)
  writeFileSync(file, source)
  const args = [...before, ...(guarded ? ['--require', guard] : []), file]
  const child = spawn(process.execPath, args, {stdio: ['ignore', 'ignore', 'pipe']})
  let stderr = ''
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const status = await new Promise<number | null>((resolve) => child.on('close', resolve))
  await wait(100)
  const hits = counts.tcp + counts.tcp6 + counts.udp + counts.udp6
  return {status, stderr, ports, counts: {...counts}, hits}
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
  {
    name: 'SHARE_ENV worker with NODE_OPTIONS set by the test',
    code: `process.env.NODE_OPTIONS = '--require ' + JSON.stringify(DNS_SETUP)
      inWorker('0', {env: SHARE_ENV, execArgv: []})`,
    observable: true,
  },
]

for (const {name, code, observable} of cases) {
  const title = `the offline guard fails a caught ${name} attempt, and no connection or packet reaches its receivers`
  test(title, async () => {
    if (observable) {
      const open = await attempt(code, {guarded: false})
      assert.ok(open.hits > 0, `without the guard, ${name} should reach the receiver`)
    }
    const guarded = await attempt(code, {guarded: true})
    assert.notEqual(guarded.status, 0, `the child should fail. stderr: ${guarded.stderr}`)
    assert.match(guarded.stderr, /Tests run offline/)
    assert.deepEqual(
      guarded.counts,
      {tcp: 0, tcp6: 0, udp: 0, udp6: 0},
      `${name} reached a receiver through the guard`,
    )
  })
}

test('an attempt counts every connection and packet that reaches its own receivers, and none sent to earlier ones', async () => {
  // This process runs under the guard, so an unguarded child sends the traffic. It sends a late
  // connection and packet to each of an earlier set of receivers. To each of its own TCP receivers
  // it opens a connection that sends nothing and waits for the receiver to close it, and to each
  // of its own UDP receivers it sends a packet.
  const earlier = await openReceivers()
  const code = `
    net.connect(${earlier.ports.PORT}, '127.0.0.1').on('error', ${ignore}).end('late')
    net.connect(${earlier.ports.PORT6}, '::1').on('error', ${ignore}).end('late')
    dgram.createSocket('udp4').send('late', ${earlier.ports.UDP}, '127.0.0.1')
    dgram.createSocket('udp6').send('late', ${earlier.ports.UDP6}, '::1')
    process.exitCode = 3
    let open = 2
    const closed = () => --open || (process.exitCode = 0)
    net.connect(PORT, '127.0.0.1').on('error', ${ignore}).on('close', closed)
    net.connect(PORT6, '::1').on('error', ${ignore}).on('close', closed)
    dgram.createSocket('udp4').send('x', UDP, '127.0.0.1')
    dgram.createSocket('udp6').send('x', UDP6, '::1')
  `
  const result = await attempt(code, {guarded: false})
  assert.deepEqual(result.counts, {tcp: 1, tcp6: 1, udp: 1, udp6: 1})
  assert.deepEqual(
    earlier.counts,
    {tcp: 1, tcp6: 1, udp: 1, udp6: 1},
    'the late traffic should reach the earlier receivers',
  )
  assert.equal(result.status, 0, 'the receivers should close a connection that sends nothing')
})

test('the offline guard leaves Unix sockets open, because they are local IPC', async () => {
  const path = join(scratch, 'ipc.sock')
  let connections = 0
  const server = net.createServer((socket) => {
    connections++
    socket.end()
  })
  await new Promise<void>((resolve) => server.listen(path, resolve))
  try {
    const code = `net.connect(${JSON.stringify(path)}).on('connect', () => process.exit(0))`
    const result = await attempt(code, {guarded: true})
    assert.equal(result.status, 0, result.stderr)
    assert.equal(connections, 1)
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
  assert.deepEqual(
    guarded.counts,
    {tcp: 0, tcp6: 0, udp: 0, udp6: 0},
    'the setup module reached a receiver through the guard',
  )
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
