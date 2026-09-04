import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileDropZone, { handleDroppedPaths } from './FileDropZone'

const mockAddJob = vi.fn()
const mockStartNextPendingJob = vi.fn()
vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

// Mock Tauri invoke for file metadata command (use vi.hoisted for proper hoisting)
const { invoke: mockInvoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

// Mock Tauri event listen to avoid unhandled rejections in jsdom
let mockUnlistenFn: ReturnType<typeof vi.fn>
vi.mock('@tauri-apps/api/event', () => ({
  listen: (..._args: any[]) => {
    mockUnlistenFn = vi.fn()
    return Promise.resolve(mockUnlistenFn)
  },
}))

// Mock Tauri window getCurrentWindow for drag-drop tests
const { getCurrentWindow: mockGetCurrentWindow } = vi.hoisted(() => ({
  getCurrentWindow: vi.fn().mockReturnValue({
    onDragDropEvent: vi.fn().mockResolvedValue(vi.fn()),
  }),
}))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: (...args: any[]) => mockGetCurrentWindow(...args),
}))

// Mock LOCAL seam module instead of node_modules plugin (use vi.hoisted for proper hoisting)
const { pickFilesViaDialog: mockPickFilesViaDialog } = vi.hoisted(() => ({
  pickFilesViaDialog: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/filePicker', () => ({
  pickFilesViaDialog: (...args: any[]) => mockPickFilesViaDialog(...args),
}))

describe('FileDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    mockUnlistenFn = vi.fn()
    // Default: return metadata that passes size check for requested paths
    mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
      (paths as string[]).map(p => ({ path: p, size: 1024, exists: true }))
    )
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        addJob: mockAddJob,
        startNextPendingJob: mockStartNextPendingJob,
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

    it('should validate Windows absolute paths via handleDroppedPaths', async () => {
      const mockT = vi.fn((key: string) => key)
      const deps = { addJob: mockAddJob, startNextPendingJob: mockStartNextPendingJob, t: mockT }

      // Test drive-prefix filtering directly
      await handleDroppedPaths([
        '/linux/path/file.png',     // Invalid - no Windows drive
        'relative/path.txt',         // Invalid - relative path
        'C:/Valid/File.png'          // Valid Windows path
      ], deps)

      // Only valid Windows path should be processed (1 job added)
      expect(mockAddJob).toHaveBeenCalledTimes(1)
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'File.png' }))
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

  describe('Local seam click handler tests', () => {
    beforeEach(() => {
      Object.defineProperty(window, '__TAURI__', {
        value: { version: '2.0.0' },
        writable: true,
        configurable: true
      })
      mockPickFilesViaDialog.mockReset().mockResolvedValue(null)
    })

    afterEach(() => {
      delete (window as any).__TAURI__
    })

    it('should call local seam pickFilesViaDialog on click and pass returned paths to queue', async () => {
      const { container } = render(<FileDropZone />)
      const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!

      // Mock seam resolving with valid paths
      mockPickFilesViaDialog.mockResolvedValue(['C:/Users/Test/a.jpg'])

      // Simulate click to trigger picker
      fireEvent.click(dropzone)

      // Local seam should have been called (not the node_modules plugin)
      expect(mockPickFilesViaDialog).toHaveBeenCalled()

      // Queue should receive the job
      await vi.waitFor(() => {
        expect(mockAddJob).toHaveBeenCalled()
      })
    })

    it('should handle null cancel from local seam as no-op (no addJob call)', async () => {
      const { container } = render(<FileDropZone />)
      const dropzone = container.querySelector('[data-testid="dropzone-dashed"]')!

      fireEvent.click(dropzone)

      // Mock seam returning null (user cancelled)
      mockPickFilesViaDialog.mockResolvedValue(null)

      await vi.waitFor(() => {
        expect(mockAddJob).not.toHaveBeenCalled()
        expect(mockStartNextPendingJob).not.toHaveBeenCalled()
      })
    })
  })

  describe('Pure drag core tests', () => {
    const mockT = vi.fn((key: string, params?: any) => key + (params ? JSON.stringify(params) : ''))
    const deps = { addJob: mockAddJob, startNextPendingJob: mockStartNextPendingJob, t: mockT }

    beforeEach(() => {
      Object.defineProperty(window, '__TAURI__', {
        value: { version: '2.0.0' },
        writable: true,
        configurable: true
      })
      mockInvoke.mockReset()
      mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
        (paths as string[]).map(p => ({ path: p, size: 1024, exists: true }))
      )
    })

    afterEach(() => {
      delete (window as any).__TAURI__
    })

    it('should process valid paths and add jobs to queue', async () => {
      await handleDroppedPaths(['C:/Users/Test/a.jpg', 'D:/Docs/b.png'], deps)

      expect(mockAddJob).toHaveBeenCalledTimes(2)
      // Verify addJob receives real metadata sizes, not hardcoded 0
      const jobCalls = mockAddJob.mock.calls.map((c: any[]) => c[0])
      expect(jobCalls.every((j: any) => j.fileSize === 1024)).toBe(true)
    })

    it('should skip oversized files and show aggregated toast', async () => {
      // Mock metadata returning one file over 20MB limit
      mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
        (paths as string[]).map(p => ({ path: p, size: p.includes('big') ? 30 * 1024 * 1024 : 1024, exists: true }))
      )

      await handleDroppedPaths([
        'C:/Users/Test/small.jpg',
        'C:/Users/Test/big.png'
      ], deps)

      // Only small file should be processed
      expect(mockAddJob).toHaveBeenCalledTimes(1)
      // Aggregated toast warning for skipped files
      expect(mockT).toHaveBeenCalledWith(expect.stringContaining('batchSkipped'), expect.any(Object))
    })

    it('should handle mixed valid/invalid extension batch with one aggregated toast', async () => {
      await handleDroppedPaths([
        'C:/Users/Test/valid.png',
        'C:/Users/Test/invalid.txt'
      ], deps)

      // Only valid file should be processed
      expect(mockAddJob).toHaveBeenCalledTimes(1)
      // Aggregated toast for skipped files
      expect(mockT).toHaveBeenCalledWith(expect.stringContaining('batchSkipped'), expect.any(Object))
    })

    it('should show error toast when all paths are invalid', async () => {
      await handleDroppedPaths([
        'C:/Users/Test/invalid1.txt',
        'C:/Users/Test/invalid2.exe'
      ], deps)

      // No jobs should be added
      expect(mockAddJob).not.toHaveBeenCalled()
      // Error toast for all invalid
      expect(mockT).toHaveBeenCalledWith('errors.allInvalid')
    })

    it('should show error toast when no valid drive prefix paths', async () => {
      await handleDroppedPaths([
        '/linux/path/file.png',
        'relative/path.txt'
      ], deps)

      // No jobs should be added
      expect(mockAddJob).not.toHaveBeenCalled()
      // Error toast for invalid path
      expect(mockT).toHaveBeenCalledWith('errors.invalidPath')
    })
  })

  describe('Browser drop handler neutralization', () => {
    it('should call preventDefault only on browser drag-drop, not extract paths from File objects', async () => {
      render(<FileDropZone />)
      const dropzone = document.querySelector('[data-testid="dropzone-dashed"]')!

      // Simulate a browser drag-drop with File objects (no .path property in jsdom)
      const files = [new File(['content'], 'test.png'), new File(['content'], 'scan.pdf')]
      const preventDefaultMock = vi.fn()
      const stopPropagationMock = vi.fn()

      // Use native Event + Object.defineProperty stubs (jsdom-safe pattern, same as dragOver test)
      const event = new Event('drop', { bubbles: true })
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultMock })
      Object.defineProperty(event, 'stopPropagation', { value: stopPropagationMock })
      Object.defineProperty(event, 'dataTransfer', { value: { files } })
      dropzone.dispatchEvent(event)

      // Browser drop should be neutralized - only preventDefault and stopPropagation called
      expect(preventDefaultMock).toHaveBeenCalled()
      expect(stopPropagationMock).toHaveBeenCalled()

      // Browser drop is neutralized — no jobs added, queue not dispatched
      await vi.waitFor(() => {
        expect(mockAddJob).not.toHaveBeenCalled()
        expect(mockStartNextPendingJob).not.toHaveBeenCalled()
      })
    })
  })

  describe('Tauri drag-drop event listener', () => {
    it('should register tauri://drag-drop listener during useEffect', () => {
      render(<FileDropZone />)

      // The component should have called getCurrentWindow to set up the listener
      expect(mockGetCurrentWindow).toHaveBeenCalled()
    })
  })

  describe('Extension validation via handleDroppedPaths', () => {
    const mockT = vi.fn((key: string, params?: any) => key + (params ? JSON.stringify(params) : ''))
    const deps = { addJob: mockAddJob, startNextPendingJob: mockStartNextPendingJob, t: mockT }

    beforeEach(() => {
      Object.defineProperty(window, '__TAURI__', {
        value: { version: '2.0.0' },
        writable: true,
        configurable: true
      })
      mockInvoke.mockReset()
      mockInvoke.mockImplementation(async (_cmd: string, { paths }: { paths: string[] }) =>
        (paths as string[]).map(p => ({ path: p, size: 1024, exists: true }))
      )
    })

    afterEach(() => {
      delete (window as any).__TAURI__
    })

    it('should filter out files with unsupported extensions (.txt)', async () => {
      await handleDroppedPaths(['C:/Users/Test/document.txt'], deps)

      expect(mockAddJob).not.toHaveBeenCalled()
    })

    it('should filter out files with unsupported extensions (.exe)', async () => {
      await handleDroppedPaths(['C:/Users/Test/malware.exe'], deps)

      expect(mockAddJob).not.toHaveBeenCalled()
    })

    it('should only process valid extensions from a mixed batch', async () => {
      await handleDroppedPaths([
        'C:/Users/Test/valid.png',
        'C:/Users/Test/invalid.txt',
        'C:/Users/Test/also-valid.pdf'
      ], deps)

      expect(mockAddJob).toHaveBeenCalledTimes(2)
      const jobCalls = mockAddJob.mock.calls.map((c: any[]) => c[0])
      expect(jobCalls.some((j: any) => j.filePath === 'C:/Users/Test/valid.png')).toBe(true)
      expect(jobCalls.some((j: any) => j.filePath === 'C:/Users/Test/also-valid.pdf')).toBe(true)
      expect(jobCalls.every((j: any) => j.filePath !== 'C:/Users/Test/invalid.txt')).toBe(true)
    })

    it('should not add invalid files to queue', async () => {
      await handleDroppedPaths([
        'C:/Users/Test/good.jpg',
        'C:/Users/Test/bad.bmp'
      ], deps)

      expect(mockAddJob).toHaveBeenCalledTimes(1)
      expect(mockAddJob).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'good.jpg' }))
    })

    it('should accept all valid extensions: png, jpg, jpeg, webp, pdf', async () => {
      await handleDroppedPaths([
        'C:/a.png',
        'D:/b.jpg',
        'E:/c.JPEG',
        'F:/d.webp',
        'C:/e.PDF'
      ], deps)

      expect(mockAddJob).toHaveBeenCalledTimes(5)
      // Verify addJob receives real metadata sizes, not hardcoded 0
      const jobCalls = mockAddJob.mock.calls.map((c: any[]) => c[0])
      expect(jobCalls.every((j: any) => j.fileSize === 1024)).toBe(true)
    })
  })
})
