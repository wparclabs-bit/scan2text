import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import DropZone from './components/DropZone'

const mockStartUpload = vi.fn()
const mockPollJob = vi.fn()

vi.mock('./stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

const { useScan2TextStore } = await import('./stores/scan2text.store')

describe('debug drop full', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const storeMock = useScan2TextStore as unknown as ReturnType<typeof vi.fn>
    storeMock.mockImplementation((selector: (state: any) => any) => {
      const state = {
        jobs: {},
        startUpload: mockStartUpload,
        pollJob: mockPollJob,
      }
      return selector(state)
    })
    mockStartUpload.mockResolvedValue('new-job-id')
    mockPollJob.mockResolvedValue(undefined)
  })

  it('test drop by directly invoking async handler', async () => {
    const { container } = render(<DropZone />)
    const dropTarget = container.querySelector('div.rounded-lg') as HTMLElement

    const file1 = new File(['content1'], 'drag1.png', { type: 'image/png' })
    const file2 = new File(['content2'], 'drag2.pdf', { type: 'application/pdf' })

    const allKeys = Object.keys(dropTarget)
    const propsKey = allKeys.find(k => k.startsWith('__reactProps$'))

    if (propsKey) {
      const props = (dropTarget as any)[propsKey]
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [file1, file2] },
      }

      console.log('event.dataTransfer.files:', mockEvent.dataTransfer?.files)
      console.log('Array.from result:', Array.from(mockEvent.dataTransfer?.files ?? []))

      if (props?.onDrop) {
        const result = props.onDrop(mockEvent as any)
        console.log('onDrop returned:', result)
        if (result && typeof result.then === 'function') {
          await result
          console.log('after await')
        }
      }
    }

    console.log('mockStartUpload calls:', mockStartUpload.mock.calls.length)
    console.log('mockPollJob calls:', mockPollJob.mock.calls.length)

    expect(mockStartUpload).toHaveBeenCalledTimes(2)
  })
})
