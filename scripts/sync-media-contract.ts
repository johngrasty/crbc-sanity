// Refreshes Studio's copy of the media contract files it reuses, and rewrites the manifest.
// Usage: MEDIA_CONTRACT_DIR=/path/to/subsplash-replacement/contract npm run contract:sync
// Never edit media-contract/ by hand. tests/media-contract.test.ts checks it against the manifest.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath, pathToFileURL} from 'node:url'

const copyDir = fileURLToPath(new URL('../media-contract/', import.meta.url))

// The files Studio copies, as paths inside the contract package.
export function contractFiles(checkout: string): string[] {
  const fixtures = readdirSync(join(checkout, 'fixtures/sanity'))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `fixtures/sanity/${name}`)
  return [
    'schemas/media-v1.schema.json',
    'src/ids.ts',
    'src/size.ts',
    'standing-schedule.json',
    ...fixtures,
  ].sort()
}

// git@github.com:owner/repo.git and https://github.com/owner/repo both give owner/repo.
const repoName = (remote: string) =>
  remote.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/)?.[1] ?? remote

export function syncMediaContract(checkout: string) {
  const contractPackage = JSON.parse(readFileSync(join(checkout, 'package.json'), 'utf8'))
  if (contractPackage.name !== '@crbc/media-contract') {
    throw new Error(`${checkout} is not the media contract package.`)
  }
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', checkout, ...args], {encoding: 'utf8'}).trim()
  const files = contractFiles(checkout)
  const changes = git('status', '--porcelain', '--', ...files)
  if (changes) {
    throw new Error(`The checkout has uncommitted contract changes:\n${changes}`)
  }

  const manifest = {
    note: 'Written by npm run contract:sync. Do not edit this folder by hand.',
    repo: repoName(git('remote', 'get-url', 'origin')),
    path: git('rev-parse', '--show-prefix').replace(/\/$/, ''),
    commit: git('rev-parse', 'HEAD'),
    files: {} as Record<string, string>,
  }
  rmSync(copyDir, {recursive: true, force: true})
  for (const file of files) {
    const bytes = readFileSync(join(checkout, file))
    mkdirSync(dirname(join(copyDir, file)), {recursive: true})
    writeFileSync(join(copyDir, file), bytes)
    manifest.files[file] = createHash('sha256').update(bytes).digest('hex')
  }
  writeFileSync(join(copyDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const checkout = process.env.MEDIA_CONTRACT_DIR
  if (!checkout) {
    console.error(
      'Set MEDIA_CONTRACT_DIR to the contract folder of a subsplash-replacement checkout.',
    )
    process.exit(1)
  }
  const {commit, files} = syncMediaContract(checkout)
  console.log(`Copied ${Object.keys(files).length} contract files from commit ${commit}.`)
}
