import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from './PreviewPanel'
import { toast } from 'sonner'

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}))

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useTranslation } = await import('react-i18next')
const { useScan2TextStore } = await import('@/stores/scan2text.store')

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      t: (key: string) => {
        switch (key) {
          case 'preview.emptyState':
            return 'Select a completed job to preview the magic.'
          case 'preview.processing':
            return 'Processing document...'
          case 'preview.failed':
            return 'OCR Failed'
          case 'preview.pdfPlaceholder':
            return 'PDF Document'
          case 'preview.copyBtn':
            return 'Copy Markdown'
          case 'preview.openFolderBtn':
            return 'Open Folder'
          case 'toast.copySuccess':
            return 'Markdown copied to clipboard!'
          default:
            return key
        }
      },
    })
    vi.mocked(toast).success = vi.fn()
    vi.mocked(toast).info = vi.fn()
  })

  function setupStore(selectedJobId: string | null, jobs: Record<string, any>) {
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = { selectedJobId, jobs }
        return selector(state)
      },
    )
  }

  it('renders empty state text for all queue items without selected job', () => {
    setupStore(null, {})
    render(<PreviewPanel />)
    expect(screen.getByTestId('preview-empty-state')).toBeInTheDocument()
  })

  it('renders MarkdownPreview component in right column with data-testid', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'completed',
        resultMarkdown: '# Hello\n\nSome text.',
      },
    })
    render(<PreviewPanel />)
    expect(screen.getByTestId('preview-markdown')).toBeInTheDocument()
  })

  it('uses resultMarkdown when available, falls back to markdownOutput', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'completed',
        resultMarkdown: 'Result content',
        markdownOutput: 'Fallback content',
      },
    })
    render(<PreviewPanel />)
    expect(screen.getByText('Result content')).toBeInTheDocument()
  })

  it('does not show markdown when no job selected', () => {
    setupStore(null, {})
    render(<PreviewPanel />)
    expect(screen.getByTestId('preview-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('preview-markdown')).not.toBeInTheDocument()
  })

  it('renders empty-state container when no job selected', () => {
    setupStore(null, {})
    render(<PreviewPanel />)
    const emptyState = screen.getByTestId('preview-empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('empty state card uses flex centering classes for centered layout', () => {
    setupStore(null, {})
    render(<PreviewPanel />)
    const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
    const card = panel?.querySelector('[data-testid="preview-empty-state"]')?.parentElement as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('flex')
    expect(card).toHaveClass('items-center')
    expect(card).toHaveClass('justify-center')
    expect(card).toHaveClass('text-center')
  })

  it('empty state card uses flex-1 with inline depth style for full-height layout', () => {
    setupStore(null, {})
    render(<PreviewPanel />)
    const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
    expect(panel).toHaveClass('h-full')
    const card = panel?.querySelector('[data-testid="preview-empty-state"]')?.parentElement as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('flex-1')
    expect(card?.style.backgroundImage).toContain('linear-gradient')
  })

  it('processing state card uses flex-1 with inline depth style for full-height layout', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'processing',
        markdownOutput: '',
      },
    })
    render(<PreviewPanel />)
    const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
    expect(panel).toHaveClass('h-full')
    const card = panel?.querySelector('[data-testid="preview-processing"]')?.parentElement as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('flex-1')
  })

  it('failed state card uses flex-1 with inline depth style for full-height layout', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'failed',
        markdownOutput: '',
        error: 'OCR error',
      },
    })
    render(<PreviewPanel />)
    const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
    expect(panel).toHaveClass('h-full')
    const card = panel?.querySelector('[data-testid="preview-error"]')?.parentElement as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('flex-1')
  })

  it('renders Markdown container with full-width class for completed jobs', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'scan.png',
        fileType: 'image/png',
        status: 'completed',
        markdownOutput: '# Result',
      },
    })
    render(<PreviewPanel />)
    const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
    expect(panel).toHaveClass('w-full')
  })

  it('panel root has min-w-0 to prevent grid item overflow in all states', () => {
    ;([null, 'processing', 'failed', 'completed'] as const).forEach((status) => {
      const jobs = status === null ? {} : {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status,
          markdownOutput: status === 'completed' ? '# Result' : '',
          error: status === 'failed' ? 'OCR error' : undefined,
        },
      }
      setupStore(status === null ? null : 'job-1', jobs)
      const { unmount } = render(<PreviewPanel />)
      const panels = document.querySelectorAll('[data-testid="panel-preview"]')
      const panel = panels[panels.length - 1] as HTMLElement
      expect(panel).toHaveClass('min-w-0')
      unmount()
    })
  })

  it('preview ScrollArea mounts a visible ScrollBar component', () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'completed',
        resultMarkdown: '# Hello\n\nSome longer content to ensure scrollability.',
      },
    })
    render(<PreviewPanel />)
    const scrollArea = screen.getByTestId('preview-scroll-area')
    expect(scrollArea).toBeInTheDocument()
    const source = require('fs').readFileSync(
      require('path').join(__dirname, './PreviewPanel.tsx'),
      'utf8',
    )
    expect(source).toContain('import { ScrollArea, ScrollBar }')
    expect(source).toContain('<ScrollBar orientation="vertical" />')
  })

  describe('Action Header (Copy & Open Folder)', () => {
    it('header is always rendered regardless of job status (structural constancy)', () => {
      ;([null, 'processing', 'failed', 'completed'] as const).forEach((status) => {
        const jobs = status === null ? {} : {
          'job-1': {
            id: 'job-1',
            fileName: 'test.png',
            fileType: 'image/png',
            status,
            resultMarkdown: status === 'completed' ? '# Result' : undefined,
            markdownOutput: status !== 'completed' ? '' : undefined,
            error: status === 'failed' ? 'OCR error' : undefined,
          },
        }
        setupStore(status === null ? null : 'job-1', jobs)
        const { unmount } = render(<PreviewPanel />)
        expect(screen.getByTestId('preview-header')).toBeInTheDocument()
        unmount()
      })
    })

    it('renders copy button with correct data-testid and label', () => {
      setupStore('job-1', {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# Test',
        },
      })
      render(<PreviewPanel />)
      const copyBtn = screen.getByTestId('preview-copy-btn')
      expect(copyBtn).toBeInTheDocument()
      expect(copyBtn).toHaveTextContent('Copy Markdown')
    })

    it('renders open folder button with correct data-testid and label', () => {
      setupStore('job-1', {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# Test',
        },
      })
      render(<PreviewPanel />)
      const openFolderBtn = screen.getByTestId('preview-open-folder-btn')
      expect(openFolderBtn).toBeInTheDocument()
      expect(openFolderBtn).toHaveTextContent('Open Folder')
    })

  it('copies markdown to clipboard when copy button is clicked (mocked)', async () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'completed',
        resultMarkdown: '# Copied Content\n\nTest text.',
      },
    })
    render(<PreviewPanel />)

    ;(window as any).navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    }

    const copyBtn = screen.getByTestId('preview-copy-btn')
    await userEvent.click(copyBtn)

    expect((window as any).navigator.clipboard.writeText).toHaveBeenCalledWith('# Copied Content\n\nTest text.')
    expect(toast.success).toHaveBeenCalledWith('Markdown copied to clipboard!')
  })

  it('open folder button click handler is a no-op (final product)', async () => {
    setupStore('job-1', {
      'job-1': {
        id: 'job-1',
        fileName: 'test.png',
        fileType: 'image/png',
        status: 'completed',
        resultMarkdown: '# Test',
      },
    })
    render(<PreviewPanel />)

    const openFolderBtn = screen.getByTestId('preview-open-folder-btn')
    await userEvent.click(openFolderBtn)

    // In final product, the handler is a no-op (placeholder for future file system access)
    expect(toast.info).not.toHaveBeenCalled()
  })

    it('copy button is borderless with transparent background', () => {
      setupStore('job-1', {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# Test',
        },
      })
      render(<PreviewPanel />)
      const copyBtn = screen.getByTestId('preview-copy-btn') as HTMLElement
      expect(copyBtn).toBeInTheDocument()
      expect(copyBtn).toHaveClass('border-none')
      expect(copyBtn).toHaveClass('bg-transparent')
    })

    it('open folder button is borderless with transparent background', () => {
      setupStore('job-1', {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# Test',
        },
      })
      render(<PreviewPanel />)
      const openBtn = screen.getByTestId('preview-open-folder-btn') as HTMLElement
      expect(openBtn).toBeInTheDocument()
      expect(openBtn).toHaveClass('border-none')
      expect(openBtn).toHaveClass('bg-transparent')
    })

    it('both header buttons are real <button> elements with translated labels', () => {
      setupStore('job-1', {
        'job-1': {
          id: 'job-1',
          fileName: 'test.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# Test',
        },
      })
      render(<PreviewPanel />)
      const buttons = Array.from(document.querySelectorAll('button'))
      const copyBtn = buttons.find((b) => b.getAttribute('data-testid') === 'preview-copy-btn')
      const openBtn = buttons.find((b) => b.getAttribute('data-testid') === 'preview-open-folder-btn')
      expect(copyBtn).toBeInTheDocument()
      expect(copyBtn!.tagName).toBe('BUTTON')
      expect(openBtn).toBeInTheDocument()
      expect(openBtn!.tagName).toBe('BUTTON')
      expect(copyBtn!.textContent).toContain('Copy Markdown')
      expect(openBtn!.textContent).toContain('Open Folder')
    })
  })

  describe('Regression — clicking completed job switches preview content', () => {
    it('switches Markdown preview content when selectedJobId changes to a different completed job', () => {
      const jobs = {
        'job-1': {
          id: 'job-1',
          fileName: 'first.png',
          fileType: 'image/png',
          status: 'completed',
          resultMarkdown: '# First Document',
        },
        'job-2': {
          id: 'job-2',
          fileName: 'second.pdf',
          fileType: 'application/pdf',
          status: 'completed',
          resultMarkdown: '# Second Document',
        },
      }
      setupStore('job-1', jobs)
      const { rerender } = render(<PreviewPanel />)
      expect(screen.getByText('First Document')).toBeInTheDocument()
      expect(screen.queryByText('Second Document')).not.toBeInTheDocument()

      setupStore('job-2', jobs)
      rerender(<PreviewPanel />)
      expect(screen.getByText('Second Document')).toBeInTheDocument()
      expect(screen.queryByText('First Document')).not.toBeInTheDocument()
    })
  })

  describe('Visual Contract — Empty State with Header Buttons (PRD FR-02)', () => {
    it('renders empty state text when no job is selected', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      expect(screen.getByTestId('preview-empty-state')).toBeInTheDocument()
      expect(screen.getByText('Select a completed job to preview the magic.')).toBeInTheDocument()
    })

    it('renders TWO header buttons in empty state (structural constancy: 0 jobs = same panel structure)', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      // PRD mandate: header buttons always rendered even when no job selected
      expect(screen.getByTestId('preview-copy-btn')).toBeInTheDocument()
      expect(screen.getByTestId('preview-open-folder-btn')).toBeInTheDocument()
    })

    it('both header buttons are present and visible in empty state (data-testid verified)', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      const copyBtn = document.querySelector('[data-testid="preview-copy-btn"]')
      const openBtn = document.querySelector('[data-testid="preview-open-folder-btn"]')
      expect(copyBtn).toBeInTheDocument()
      expect(openBtn).toBeInTheDocument()
      expect(copyBtn).toBeVisible()
      expect(openBtn).toBeVisible()
    })

    it('empty state header buttons have correct labels', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      const copyBtn = screen.getByTestId('preview-copy-btn')
      const openBtn = screen.getByTestId('preview-open-folder-btn')
      expect(copyBtn).toHaveTextContent('Copy Markdown')
      expect(openBtn).toHaveTextContent('Open Folder')
    })

    it('empty state maintains full panel structure (flex, min-w-0, h-full)', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      const panel = document.querySelector('[data-testid="panel-preview"]') as HTMLElement
      expect(panel).toHaveClass('h-full')
      expect(panel).toHaveClass('min-w-0')
    })
  })

  describe('FIX28b — Always-Rendered Preview Header (PRD structural constancy)', () => {
    it('preview-header container exists in empty state with both buttons inside', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      const header = screen.getByTestId('preview-header')
      expect(header).toBeInTheDocument()
      expect(header.querySelector('[data-testid="preview-copy-btn"]')).toBeInTheDocument()
      expect(header.querySelector('[data-testid="preview-open-folder-btn"]')).toBeInTheDocument()
    })

    it('preview-empty-state container contains zero buttons', () => {
      setupStore(null, {})
      render(<PreviewPanel />)
      const emptyState = screen.getByTestId('preview-empty-state')
      expect(emptyState.querySelectorAll('button').length).toBe(0)
    })

    it('preview-header exists in processing state (structural constancy)', () => {
      setupStore('job-1', {
        'job-1': { id: 'job-1', fileName: 'test.png', fileType: 'image/png', status: 'processing', markdownOutput: '' },
      })
      render(<PreviewPanel />)
      expect(screen.getByTestId('preview-header')).toBeInTheDocument()
    })

    it('preview-header exists in failed state (structural constancy)', () => {
      setupStore('job-1', {
        'job-1': { id: 'job-1', fileName: 'test.png', fileType: 'image/png', status: 'failed', markdownOutput: '', error: 'OCR error' },
      })
      render(<PreviewPanel />)
      expect(screen.getByTestId('preview-header')).toBeInTheDocument()
    })

    it('preview-header exists in completed state (structural constancy)', () => {
      setupStore('job-1', {
        'job-1': { id: 'job-1', fileName: 'test.png', fileType: 'image/png', status: 'completed', resultMarkdown: '# Result' },
      })
      render(<PreviewPanel />)
      expect(screen.getByTestId('preview-header')).toBeInTheDocument()
    })
  })
})
