// scripts/run/aviapages.ts
import { spawn } from 'node:child_process'

const headful = process.argv.includes('--headful')
const exe = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['tsx', 'scripts/sources/aviapages.ts']
if (headful) args.push('--headful')

const cp = spawn(exe, args, { stdio: 'inherit', env: process.env })
cp.on('exit', (code) => process.exit(code ?? 1))