import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('vite proxy target', () => {
  it('proxy target must contain port 47351 (unified dev/prod contract)', () => {
    const configPath = path.resolve(import.meta.dirname, '../../vite.config.ts')
    const content = fs.readFileSync(configPath, 'utf-8')
    expect(content).toContain('http://127.0.0.1:47351')
  })
})
