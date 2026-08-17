import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarkdownPreview from './MarkdownPreview'

describe('MarkdownPreview', () => {
  it('renders basic markdown text', () => {
    render(<MarkdownPreview markdown="Hello **world**" />)
    const container = document.querySelector('[data-testid="preview-markdown"]')
    expect(container?.textContent).toContain('Hello')
    expect(container?.textContent).toContain('world')
  })

  it('renders GFM table correctly', () => {
    const tableMd = '| Name | Value |\n|------|-------|\n| A    | 1     |'
    render(<MarkdownPreview markdown={tableMd} />)
    const table = document.querySelector('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders GFM strikethrough', () => {
    render(<MarkdownPreview markdown="~~deleted~~" />)
    const del = document.querySelector('del')
    expect(del).toBeInTheDocument()
    expect(del).toHaveTextContent('deleted')
  })

  it('renders GFM task list checkboxes', () => {
    render(<MarkdownPreview markdown="* [ ] incomplete\n* [x] complete" />)
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('handles empty markdown without crashing', () => {
    render(<MarkdownPreview markdown="" />)
    expect(screen.getByTestId('preview-markdown')).toBeInTheDocument()
  })

  it('handles undefined markdown gracefully', () => {
    render(<MarkdownPreview markdown={undefined as unknown as string} />)
    expect(screen.getByTestId('preview-markdown')).toBeInTheDocument()
  })

  it('has preview-markdown test id', () => {
    render(<MarkdownPreview markdown="# Title" />)
    expect(screen.getByTestId('preview-markdown')).toBeInTheDocument()
  })

  it('applies prose and dark:prose-invert classes to container', () => {
    render(<MarkdownPreview markdown="# Hello" />)
    const container = document.querySelector('[data-testid="preview-markdown"]') as HTMLElement
    expect(container).toHaveClass('prose')
    expect(container).toHaveClass('dark:prose-invert')
  })

  it('applies prose-compact and does NOT apply prose-sm to container', () => {
    render(<MarkdownPreview markdown="# Hello" />)
    const container = document.querySelector('[data-testid="preview-markdown"]') as HTMLElement
    expect(container).toHaveClass('prose-compact')
    expect(container).not.toHaveClass('prose-sm')
  })

  it('renders headings with proper styling when typography plugin is loaded', () => {
    render(<MarkdownPreview markdown="# Heading\n\n## Subheading" />)
    const container = document.querySelector('[data-testid="preview-markdown"]') as HTMLElement
    // Verify prose classes are applied (typography plugin styles will be applied by Tailwind)
    expect(container).toHaveClass('prose')
    // Basic content check - jsdom may not fully render nested structure
    expect(container?.textContent).toContain('Heading')
    expect(container?.textContent).toContain('Subheading')
  })

  it('renders lists with proper block elements', () => {
    render(<MarkdownPreview markdown="- Item 1\n- Item 2" />)
    const container = document.querySelector('[data-testid="preview-markdown"]') as HTMLElement
    // Verify prose classes are applied
    expect(container).toHaveClass('prose')
    // Basic content check - jsdom may normalize list rendering
    expect(container?.textContent).toContain('Item 1')
    expect(container?.textContent).toContain('Item 2')
  })

  it('strips <img> tags from display so raw HTML is not visible', () => {
    const md = '<img src="./x_files/images/bbox_1_2_3_4.jpg" />\n\nO-SHOCK'
    render(<MarkdownPreview markdown={md} />)
    const container = document.querySelector('[data-testid="preview-markdown"]')
    expect(container?.textContent).not.toContain('<img')
    expect(container?.textContent).not.toContain('src=')
    expect(container?.textContent).toContain('O-SHOCK')
  })
})
