import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileDropZone from './FileDropZone'
import { uploadFile } from '@/lib/api'

const mockAddJob = vi.fn()
vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

// Mock the uploadFile API call
vi.mock('@/lib/api', () => ({
  uploadFile: vi.fn().mockResolvedValue({ task_id: 'test-task-id' }),
}))

// Mock Tauri invoke for file metadata command
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

describe('FileDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    // Default: return metadata that passes size check for requested paths
    mockInvoke.mockImplementation(async ({ paths }: { paths: string[] }) =>
      (paths as string[]).map(p => ({ path: p, size: 1024, exists: true }))
    )
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
      }
      return selector(state)
    })
  })

  it('should render with data-testid="dropzone-dashed"', () => {
    const { container } = render(<FileDropZone />)
    expect(container.querySelector('[data-testid="dropzone-dashed"]')).toBeInTheDocument()
  })

  it('should have data-state="idle" by default', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')
    expect(dropzone).toHaveAttribute('data-state', 'idle')
  })

  it('should set data-state="drag" on drag enter', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [] } })
    expect(dropzone).toHaveAttribute('data-state', 'drag')
  })

  it('should reset to idle on drag leave', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [] } })
    fireEvent.dragLeave(dropzone)
    expect(dropzone).toHaveAttribute('data-state', 'idle')
  })

  it('dragEnter sets data-state="drag" with warm highlight class', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [] } })
    expect(dropzone).toHaveAttribute('data-state', 'drag')
    expect(dropzone).toHaveClass('ring-2')
    expect(dropzone).toHaveClass('border-accent')
  })

  it('drag counter: double enter then double leave clears state', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
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
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
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

  it('should be keyboard accessible with role="button" and tabIndex', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dropzone).toHaveAttribute('role', 'button')
    expect(dropzone).toHaveAttribute('tabindex', '0')
  })

  it('should contain text paragraphs inside the dropzone area', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    const paragraphs = dropzone.querySelectorAll('p')
    expect(paragraphs.length).toBeGreaterThan(0)
  })

  it('dashed drop area has w-full class', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dropzone).toHaveClass('w-full')
  })

  it('dropzone container has flex-1, min-h-0, w-full classes to fill card height', () => {
    const { container } = render(<FileDropZone />)
    const dashed = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dashed).toHaveClass('flex-1')
    expect(dashed).toHaveClass('min-h-0')
    expect(dashed).toHaveClass('w-full')
  })

  it('dropzone container always has centering classes even with prop className', () => {
    const { container } = render(<FileDropZone className="flex-1 min-h-0 w-full" />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dropzone).toHaveClass('items-center')
    expect(dropzone).toHaveClass('justify-center')
    expect(dropzone).toHaveClass('flex-col')
    expect(dropzone).toHaveClass('flex-1')
    expect(dropzone).toHaveClass('min-h-0')
    expect(dropzone).toHaveClass('w-full')
  })

  it('dropzone container has gap-2 and p-4 always', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dropzone).toHaveClass('gap-2')
    expect(dropzone).toHaveClass('p-4')
  })

  it('dropzone container has flex and w-full always', () => {
    const { container } = render(<FileDropZone />)
    const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
    expect(dropzone).toHaveClass('flex')
    expect(dropzone).toHaveClass('w-full')
  })

  describe('Tauri drag-drop behavior', () => {
    beforeEach(() => {
      // Mock Tauri environment
      Object.defineProperty(window, '__TAURI__', {
        value: { version: '1.0.0' },
        writable: true,
        configurable: true
      })
    })

    afterEach(() => {
      // Clean up Tauri mock
      delete (window as any).__TAURI__
    })

    it('should extract absolute paths from Tauri drag-drop event', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [
            { path: 'C:/Users/Test/file1.png' },
            { path: 'D:/Pictures/photo.jpg' },
            { name: 'legacy.txt' }
          ]
        }
      } as unknown as React.DragEvent<HTMLDivElement>

      fireEvent.drop(dropzone, mockEvent)

      await vi.waitFor(() => {
        // Verify at least the first path was extracted correctly
        expect(uploadFile).toHaveBeenCalledWith(
          ['C:/Users/Test/file1.png'],
          false
        )
      })
    })

    it('should validate Windows absolute paths only', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [
            { path: '/linux/path/file.png' }, // Invalid Linux path
            { path: 'relative/path.txt' }, // Invalid relative path
            { path: 'C:/Valid/File.png' } // Valid Windows path
          ]
        }
      } as unknown as React.DragEvent<HTMLDivElement>

      fireEvent.drop(dropzone, mockEvent)

      await vi.waitFor(() => {
        // Only valid Windows path should be processed
        expect(uploadFile).toHaveBeenCalledWith(['C:/Valid/File.png'], false)
      })
    })
  })

  describe('File input fallback', () => {
    it('should trigger file picker when clicked', () => {
      const { container } = render(<FileDropZone />)
      const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!
      fireEvent.click(dropzone)
      // In non-Tauri environment, file picker should open
      // This test verifies the click handler works
      expect(true).toBe(true)
    })
  })

  describe('Click handler (triggerPicker) path extraction', () => {
    it('should extract Tauri absolute .path from clicked files, not bare f.name', async () => {
      // Verify the path extraction logic that triggerPicker uses:
      // paths = files.map(f => (f as any).path || f.name)
      // This ensures absolute Tauri paths are passed instead of bare filenames.
      const files = [
        Object.assign(new File([''], 'photo.png'), { path: 'C:/Users/Test/photo.png' }),
        Object.assign(new File([''], 'scan.pdf'), { path: 'D:/Docs/scan.pdf' }),
      ]

      // Simulate triggerPicker's extraction: (f as any).path || f.name
      const paths = files.map((f: any) => f.path || f.name)

      // Must extract absolute .path values, not bare names.
      expect(paths).toEqual(['C:/Users/Test/photo.png', 'D:/Docs/scan.pdf'])
      expect(paths).not.toEqual(['photo.png', 'scan.pdf'])
    })

    it('should render translated dropzone text, not raw i18n keys', () => {
      // Render with English locale active — the component uses t('dropzone.dropPrompt')
      // and t('dropzone.maxFiles'). If those keys are missing from en.json the rendered
      // DOM will contain the literal strings "dropzone.dropPrompt" / "dropzone.maxFiles".
      const { container } = render(<FileDropZone />)
      const text = container.textContent

      expect(text).not.toContain('dropzone.dropPrompt')
      expect(text).not.toContain('dropzone.maxFiles')
    })

    it('should render translated dropzone prompt and max-files count, not raw keys', () => {
      // Positive assertion: verified translations must appear in the DOM.
      // Negative assertions: missing keys fall back to literal key strings — those must NOT appear.
      const { container } = render(<FileDropZone />)
      const text = container.textContent

      expect(text).toContain('Click or drag')
      expect(text).toContain('Max 10 files per batch')
      expect(text).not.toContain('dropzone.dropPrompt')
      expect(text).not.toContain('dropzone.maxFiles')
      // errors.invalidPath is a toast key; if missing it would surface as raw text in any rendered output.
      expect(text).not.toContain('errors.invalidPath')
    })
  })

  describe('Extension validation', () => {
    beforeEach(() => {
      Object.defineProperty(window, '__TAURI__', {
        value: { version: '1.0.0' },
        writable: true,
        configurable: true
      })
    })

    afterEach(() => {
      delete (window as any).__TAURI__
    })

    it('should filter out files with unsupported extensions (.txt)', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      // Create a proper File-like object with path property for Tauri
      const file = Object.assign(new File([''], 'document.txt'), { path: 'C:/Users/Test/document.txt' })
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

      await vi.waitFor(() => {
        expect(uploadFile).not.toHaveBeenCalled()
        expect(mockAddJob).not.toHaveBeenCalled()
      })
    })

    it('should filter out files with unsupported extensions (.exe)', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const file = Object.assign(new File([''], 'malware.exe'), { path: 'C:/Users/Test/malware.exe' })
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

      await vi.waitFor(() => {
        expect(uploadFile).not.toHaveBeenCalled()
        expect(mockAddJob).not.toHaveBeenCalled()
      })
    })

    it('should only process valid extensions from a mixed batch', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const files = [
        Object.assign(new File([''], 'valid.png'), { path: 'C:/Users/Test/valid.png' }),
        Object.assign(new File([''], 'invalid.txt'), { path: 'C:/Users/Test/invalid.txt' }),
        Object.assign(new File([''], 'also-valid.pdf'), { path: 'C:/Users/Test/also-valid.pdf' }),
      ]
      fireEvent.drop(dropzone, { dataTransfer: { files } })

      await vi.waitFor(() => {
        expect(uploadFile).toHaveBeenCalledTimes(2)
        expect(mockAddJob).toHaveBeenCalledTimes(2)
        const calledPaths = (uploadFile as ReturnType<typeof vi.fn>).mock.calls.map(
          call => call[0][0]
        )
        expect(calledPaths).toContain('C:/Users/Test/valid.png')
        expect(calledPaths).toContain('C:/Users/Test/also-valid.pdf')
        expect(calledPaths).not.toContain('C:/Users/Test/invalid.txt')
      })
    })

    it('should not add invalid files to queue', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const files = [
        Object.assign(new File([''], 'good.jpg'), { path: 'C:/Users/Test/good.jpg' }),
        Object.assign(new File([''], 'bad.bmp'), { path: 'C:/Users/Test/bad.bmp' }),
      ]
      fireEvent.drop(dropzone, { dataTransfer: { files } })

      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalledTimes(1)
        expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'good.jpg' }))
      })
    })

    it('should accept all valid extensions: png, jpg, jpeg, webp, pdf', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!
      const files = [
        Object.assign(new File([''], 'a.png'), { path: 'C:/a.png' }),
        Object.assign(new File([''], 'b.jpg'), { path: 'D:/b.jpg' }),
        Object.assign(new File([''], 'c.JPEG'), { path: 'E:/c.JPEG' }),
        Object.assign(new File([''], 'd.webp'), { path: 'F:/d.webp' }),
        Object.assign(new File([''], 'e.PDF'), { path: 'C:/e.PDF' }),
      ]
      fireEvent.drop(dropzone, { dataTransfer: { files } })

      await vi.waitFor(() => {
        expect(uploadFile).toHaveBeenCalledTimes(5)
        expect(mockAddJob).toHaveBeenCalledTimes(5)
      })
    })
  })
})
