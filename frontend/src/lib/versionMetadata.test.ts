import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(import.meta.dirname, '../..')

describe('app metadata version alignment', () => {
  it('package.json carries semver 1.1.0', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    expect(pkg.version).toBe('1.1.0')
  })

  it('tauri.conf.json carries semver 1.1.0', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'src-tauri/tauri.conf.json'), 'utf-8')
    const conf = JSON.parse(raw) as Record<string, unknown>
    expect(conf.version).toBe('1.1.0')
  })
})
