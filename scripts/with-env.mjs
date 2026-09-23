import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'
const [file, command, ...args] = process.argv.slice(2)
if (!file || !['dev','build','start'].includes(command)) throw new Error('Usage: node scripts/with-env.mjs <env-file> dev|build|start [Next.js arguments]')
const overrides = parseEnv(readFileSync(file, 'utf8'))
delete overrides.NODE_ENV
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', command, ...args], {
  env: { ...process.env, ...overrides, NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'inherit',
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', code => { process.exitCode = code ?? 1 })
