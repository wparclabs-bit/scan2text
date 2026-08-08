import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { validateFilesBatch, type SkippedFile } from '@/lib/fileValidation'
import { useScan2TextStore } from '@/stores/scan2text.store'

interface FileDropZoneProps {
  onFileAdd?: (fileName: string) => void
  className?: string
}

export default function FileDropZone({ onFileAdd, className }: FileDropZoneProps) {
  const [dragCount, setDragCount] = useState(0)
  const isDragOver = dragCount > 0
  const inputRef = useRef<HTMLInputElement>(null)
  const addJob = useScan2TextStore((s) => s.addJob)
  const startUpload = useScan2TextStore((s) => s.startUpload)
  const { t } = useTranslation()

  const triggerPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        triggerPicker()
      }
    },
    [triggerPicker],
  )

  const processFiles = useCallback(
    async (files: File[]) => {
      const { validFiles, skippedFiles } = validateFilesBatch(files)

      const MAX_BATCH = 10
      let extraSkipped: SkippedFile[] = []
      if (validFiles.length > MAX_BATCH) {
        extraSkipped = validFiles.slice(MAX_BATCH).map((f) => ({ fileName: f.name, size: f.size, reason: 'unsupported' as const }))
        const extraNames = validFiles.slice(MAX_BATCH).map((f) => f.name)
        extraNames.forEach((name) => {
          console.log(`[scan2text] batch cap: skipped ${name}`)
        })
        toast.warning(t('dropzone.maxFilesWarning'))
      }

      const finalValidFiles = validFiles.slice(0, MAX_BATCH)

      if (finalValidFiles.length > 0) {
        for (const file of finalValidFiles) {
          const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`

          addJob({ id: jobId, fileName: file.name, fileSize: file.size })

          try {
            await startUpload({ file, jobId })
            onFileAdd?.(file.name)
          } catch {
            toast.error(t('errors.uploadFailed'))
          }
        }
      }

      const allSkipped = [...skippedFiles, ...extraSkipped]
      if (allSkipped.length > 0 && finalValidFiles.length > 0) {
        const unsupportedCount = allSkipped.filter((f) => f.reason === 'unsupported').length
        const tooLargeCount = allSkipped.filter((f) => f.reason === 'tooLarge').length
        toast.warning(
          t('errors.batchSkipped', {
            total: allSkipped.length,
            unsupported: unsupportedCount,
            tooLarge: tooLargeCount,
          }),
        )
      } else if (allSkipped.length > 0 && finalValidFiles.length === 0) {
        toast.warning(t('errors.allInvalid'))
      }

      setDragCount(0)
    },
    [addJob, startUpload, onFileAdd, t],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length > 0) processFiles(files)
      e.target.value = ''
    },
    [processFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCount(0)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const handleDragEnter = useCallback(() => {
    setDragCount((c) => c + 1)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCount((c) => Math.max(0, c - 1))
  }, [])

  return (
    <div
      data-testid="dropzone"
      data-state={isDragOver ? 'drag' : 'idle'}
      className={`${className ?? 'w-full flex-1 flex flex-col items-center justify-center gap-2 p-4'} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragOver
          ? 'ring-2 ring-accent/60 border-accent bg-[rgba(227,165,95,0.08)]'
          : 'border-muted-foreground/30 hover:border-primary/50'
      }`}
      onClick={triggerPicker}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      aria-label="Upload file"
    >
      <input
        ref={inputRef}
        data-testid="dropzone-input"
        type="file"
        className="hidden"
        onChange={handleChange}
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        multiple
      />
      <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>

    </div>
  )
}
