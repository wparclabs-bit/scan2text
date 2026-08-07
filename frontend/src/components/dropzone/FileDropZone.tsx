import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { validateFilesBatch } from '@/lib/fileValidation'
import { useScan2TextStore } from '@/stores/scan2text.store'

interface FileDropZoneProps {
  onFileAdd?: (fileName: string) => void
}

export default function FileDropZone({ onFileAdd }: FileDropZoneProps) {
  const [state, setState] = useState<'idle' | 'drag-over' | 'error'>('idle')
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

      if (validFiles.length > 0) {
        for (const file of validFiles) {
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

      if (skippedFiles.length > 0 && validFiles.length > 0) {
        const unsupportedCount = skippedFiles.filter((f) => f.reason === 'unsupported').length
        const tooLargeCount = skippedFiles.filter((f) => f.reason === 'tooLarge').length
        toast.warning(
          t('errors.batchSkipped', {
            total: skippedFiles.length,
            unsupported: unsupportedCount,
            tooLarge: tooLargeCount,
          }),
        )
      } else if (skippedFiles.length > 0 && validFiles.length === 0) {
        toast.warning(t('errors.allInvalid'))
      }

      setState('idle')
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
      setState('idle')
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState('drag-over')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')
  }, [])

  return (
    <div
      data-testid="dropzone"
      data-state={state}
      className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        state === 'drag-over'
          ? 'border-primary bg-primary/10'
          : state === 'error'
            ? 'border-destructive bg-destructive/10 animate-shake'
            : 'border-muted-foreground/30 hover:border-primary/50'
      }`}
      onClick={triggerPicker}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
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
      {state === 'error' && (
        <p className="text-xs text-destructive">{t('errors.unsupportedFileType')}</p>
      )}
    </div>
  )
}
