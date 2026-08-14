import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileDropZone from './FileDropZone'

const mockAddJob = vi.fn()
const mockStartUpload = vi.fn().mockResolvedValue('job-test-id')
const mockOnFileAdd = vi.fn()

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('FileDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
        startUpload: mockStartUpload,
      }
      return selector(state)
    })
  })

  it('should render with data-testid="dropzone"', () => {
    const { container } = render(<FileDropZone />)
    expect(container.querySelector('[data-testid="dropzone"]')).toBeInTheDocument()
  })

  it('should render a hidden file input with data-testid="dropzone-input"', () => {
    const { container } = render(<FileDropZone />)
    const input = container.querySelector('[data-testid="dropzone-input"]') as HTMLInputElement | null
    expect(input).toBeInTheDocument()
    expect(input?.type).toBe('file')
  })

  it('should have data-state="idle" by default', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')
    expect(dropzone).toHaveAttribute('data-state', 'idle')
  })

  it('should set data-state="drag" on drag enter', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [new File(['x'], 'test.png')] } })
    expect(dropzone).toHaveAttribute('data-state', 'drag')
  })

  it('should reset to idle on drag leave', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [new File(['x'], 'test.png')] } })
    fireEvent.dragLeave(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'idle')
  })

  it('dragEnter sets data-state="drag" with warm highlight class', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [new File(['x'], 'test.png')] } })
    expect(dropzone).toHaveAttribute('data-state', 'drag')
    expect(dropzone).toHaveClass('ring-2')
    expect(dropzone).toHaveClass('border-accent')
  })

  it('drag counter: double enter then double leave clears state', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    fireEvent.dragEnter(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'drag')
    fireEvent.dragEnter(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'drag')
    fireEvent.dragLeave(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'drag')
    fireEvent.dragLeave(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'idle')
  })

  it('dragOver prevents default and stop propagation', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const pd = vi.fn()
    const ss = vi.fn()
    const event = new MouseEvent('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'preventDefault', { value: pd })
    Object.defineProperty(event, 'stopPropagation', { value: ss })
    Object.defineProperty(event, 'dataTransfer', { value: { files: [] } })
    dropzone.dispatchEvent(event)
    expect(pd).toHaveBeenCalled()
    expect(ss).toHaveBeenCalled()
  })

  it('should open file picker when clicked', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const input = container.querySelector('[data-testid="dropzone-input"]') as HTMLInputElement

    vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.click(dropzone)
    expect(input.click).toHaveBeenCalled()
  })

  it('should open file picker on Enter key', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const input = container.querySelector('[data-testid="dropzone-input"]') as HTMLInputElement

    vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.keyDown(dropzone, { key: 'Enter' })
    expect(input.click).toHaveBeenCalled()
  })

  it('should open file picker on Space key', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const input = container.querySelector('[data-testid="dropzone-input"]') as HTMLInputElement

    vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.keyDown(dropzone, { key: ' ' })
    expect(input.click).toHaveBeenCalled()
  })

  it('should stay idle when an invalid file is dropped (all-invalid batch)', async () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile] } })
    await vi.waitFor(() => {
      expect(dropzone).toHaveAttribute('data-state', 'idle')
    })
  })

  it('should not call addJob when an invalid file is dropped', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile] } })
    await vi.waitFor(() => {
      expect(mockAddJob).not.toHaveBeenCalled()
    })
  })

  it('should call addJob with a queue item when a valid PNG is dropped', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const pngFile = new File(['content'], 'scan.png', { type: 'image/png' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pngFile] } })

    await vi.waitFor(() => {
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'scan.png' }))
    })
  })

  it('should call onFileAdd callback when a valid file is accepted', async () => {
    render(<FileDropZone onFileAdd={mockOnFileAdd} />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const pdfFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [pdfFile] } })

    await vi.waitFor(() => {
      expect(mockOnFileAdd).toHaveBeenCalledWith('doc.pdf')
    })
  })

  it('should process all valid files when multiple files are dropped', async () => {
    render(<FileDropZone />)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    const file1 = new File(['a'], 'first.png', { type: 'image/png' })
    const file2 = new File(['b'], 'second.jpg', { type: 'image/jpeg' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file1, file2] } })

    await vi.waitFor(() => {
      expect(mockAddJob).toHaveBeenCalledTimes(2)
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'first.png' }))
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'second.jpg' }))
    })
  })

  it('should stay idle after dropping an invalid file', async () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile] } })
    await vi.waitFor(() => {
      expect(dropzone).toHaveAttribute('data-state', 'idle')
    })
  })

  it('should be keyboard accessible with role="button" and tabIndex', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    expect(dropzone).toHaveAttribute('role', 'button')
    expect(dropzone).toHaveAttribute('tabindex', '0')
  })

  it('should not contain text paragraphs inside the dropzone area (icon-only)', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    const paragraphs = dropzone.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('dashed drop area has w-full class', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    expect(dropzone).toHaveClass('w-full')
  })

  it('dropzone container always has centering classes even with prop className', () => {
    const { container } = render(<FileDropZone className="flex-1 min-h-0 w-full" />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    // Default centering classes must always be present
    expect(dropzone).toHaveClass('items-center')
    expect(dropzone).toHaveClass('justify-center')
    expect(dropzone).toHaveClass('flex-col')
    // Prop classes must also be present
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
    expect(dropzone).toHaveClass('w-full')
  })

  it('dropzone container has gap-2 and p-4 always', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    expect(dropzone).toHaveClass('gap-2')
    expect(dropzone).toHaveClass('p-4')
  })

  it('dropzone container has flex and w-full always', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone"]')!
    expect(dropzone).toHaveClass('flex')
    expect(dropzone).toHaveClass('w-full')
  })

  describe('multi-file behavior', () => {
    it('should add multiple valid files to queue in FIFO order', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone"]')!
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.jpg', { type: 'image/jpeg' })
      const file3 = new File(['c'], 'third.webp', { type: 'image/webp' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [file1, file2, file3] } })

      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalledTimes(3)
      })
      const callArgs = mockAddJob.mock.calls.map((call) => call[0].fileName)
      expect(callArgs).toEqual(['first.png', 'second.jpg', 'third.webp'])
    })

    it('should add only valid files from a mixed batch', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone"]')!
      const validPng = new File(['a'], 'valid.png', { type: 'image/png' })
      const invalidTxt = new File(['b'], 'invalid.txt', { type: 'text/plain' })
      const validPdf = new File(['c'], 'valid.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [validPng, invalidTxt, validPdf] } })

      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalledTimes(2)
        const callArgs = mockAddJob.mock.calls.map((call) => call[0].fileName)
        expect(callArgs).toEqual(['valid.png', 'valid.pdf'])
      })
    })

    it('should not block valid files because of invalid files', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone"]')!
      const invalidTxt = new File(['b'], 'invalid.txt', { type: 'text/plain' })
      const validPng = new File(['a'], 'valid.png', { type: 'image/png' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [invalidTxt, validPng] } })

      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalledTimes(1)
        expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'valid.png' }))
      })
    })

    it('should add no jobs when all files are invalid', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone"]')!
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const exeFile = new File(['content'], 'malware.exe', { type: 'application/octet-stream' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [txtFile, exeFile] } })

      await vi.waitFor(() => {
        expect(mockAddJob).not.toHaveBeenCalled()
      })
    })

    it('should process files from file input in FIFO order', async () => {
      render(<FileDropZone />)
      const input = document.querySelector('[data-testid="dropzone-input"]') as HTMLInputElement
      const file1 = new File(['a'], 'first.png', { type: 'image/png' })
      const file2 = new File(['b'], 'second.jpg', { type: 'image/jpeg' })

      Object.defineProperty(input, 'files', { value: [file1, file2] })
      fireEvent.change(input)

      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalledTimes(2)
        const callArgs = mockAddJob.mock.calls.map((call) => call[0].fileName)
        expect(callArgs).toEqual(['first.png', 'second.jpg'])
      })
    })
  })
})
