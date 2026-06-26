import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { execFileSync } from 'child_process'

const targets = {
  'darwin-arm64': {
    pkg: 'node22-macos-arm64',
    triple: 'aarch64-apple-darwin',
    extension: '',
  },
  'darwin-x64': {
    pkg: 'node22-macos-x64',
    triple: 'x86_64-apple-darwin',
    extension: '',
  },
  'linux-arm64': {
    pkg: 'node22-linux-arm64',
    triple: 'aarch64-unknown-linux-gnu',
    extension: '',
  },
  'linux-x64': {
    pkg: 'node22-linux-x64',
    triple: 'x86_64-unknown-linux-gnu',
    extension: '',
  },
  'win32-x64': {
    pkg: 'node22-win-x64',
    triple: 'x86_64-pc-windows-msvc',
    extension: '.exe',
  },
}

const target = targets[`${process.platform}-${process.arch}`]

if (!target) {
  throw new Error(`Unsupported sidecar target: ${process.platform}-${process.arch}`)
}

const input = resolve('dist-server/contentflow-api.mjs')
const output = resolve(`src-tauri/binaries/contentflow-api-${target.triple}${target.extension}`)

mkdirSync(dirname(output), { recursive: true })

execFileSync(
  'npx',
  [
    'pkg',
    input,
    '--targets',
    target.pkg,
    '--output',
    output,
    '--public-packages',
    '*',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PKG_CACHE_PATH: resolve('node_modules/.cache/pkg'),
    },
  },
)
