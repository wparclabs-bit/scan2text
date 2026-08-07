import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CommandCenterLayout from './CommandCenterLayout'

describe('CommandCenterLayout grid overflow hygiene', () => {
  it('each grid child wrapper carries min-w-0 and overflow-hidden', () => {
    render(<CommandCenterLayout />)
    const children = Array.from(document.querySelectorAll('main > div'))
    expect(children).toHaveLength(3)
    children.forEach((child) => {
      expect(child).toHaveClass('min-w-0')
      expect(child).toHaveClass('overflow-hidden')
    })
  })
})
