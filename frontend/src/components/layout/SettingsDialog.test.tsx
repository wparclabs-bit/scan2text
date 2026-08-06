import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsDialog from './SettingsDialog'

const mockOnOpenChange = vi.fn()

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with data-testid="settings-dialog"', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(screen.getByTestId('settings-dialog')).toBeInTheDocument()
  })

  it('closes when Close button is clicked', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    const closeBtn = screen.getAllByText('Close')[0] as HTMLElement
    fireEvent.click(closeBtn)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders General section with Language selector', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument()
  })

  it('renders General section with Theme selector', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
  })

  it('renders Processing section header', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(screen.getByText(/Processing.*Backend Required/i)).toBeInTheDocument()
  })

  it('renders Output Directory input as disabled', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    const outputInput = screen.getByLabelText(/output directory/i)
    expect(outputInput).toBeDisabled()
  })

  it('renders Browse button as disabled', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    const browseBtn = screen.getByText('Browse')
    expect(browseBtn).toBeDisabled()
  })

  it('renders Max PDF Pages input as disabled', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    const maxPagesInput = screen.getByLabelText(/max pdf pages/i)
    expect(maxPagesInput).toBeDisabled()
  })

  it('renders CPU Threads input as disabled', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    const cpuInput = screen.getByLabelText(/cpu threads/i)
    expect(cpuInput).toBeDisabled()
  })

  it('renders lock emoji in Processing section labels', () => {
    render(<SettingsDialog open={true} onOpenChange={mockOnOpenChange} />)
    // Check for 🔒 emoji in the processing section labels
    const content = screen.getByTestId('settings-dialog').innerHTML
    expect(content).toContain('\ud83d\udd12')
  })

  it('does not render when open is false', () => {
    const { container } = render(
      <SettingsDialog open={false} onOpenChange={mockOnOpenChange} />
    )
    expect(container.querySelector('[data-testid="settings-dialog"]')).not.toBeInTheDocument()
  })
})
