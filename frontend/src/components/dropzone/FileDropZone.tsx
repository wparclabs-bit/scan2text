import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import { useScan2TextStore } from '@/stores/scan2text.store'
import { uploadFile } from '@/lib/api'
import { fileKind } from '@/lib/fileKind'

// PROBE-TEMP START — temporary runtime-path probe, remove before remediation slice
// Channel 3: tauri://drag-drop event listener (paths are strings in Tauri v2)
useEffect(() => {
  const unlisten = listen<{ type: string; paths: string[] }>('tauri://drag-drop', (event: any) => {
    console.log('[PROBE] tauri:', JSON.stringify(event))
  })
  return () => { unlisten.then((fn) => fn()) }
}, [])
// PROBE-TEMP END

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

interface FileMetadata {
  path: string
  size: number | null
  exists: boolean
}

interface FileDropZoneProps {
  onFileAdd?: (fileName: string) => void
  className?: string
}

export default function FileDropZone({ onFileAdd, className }: FileDropZoneProps) {
  const [dragCount, setDragCount] = useState(0)
  const isDragOver = dragCount > 0
  const addJob = useScan2TextStore((s) => s.addJob)
  const { t } = useTranslation()

  const triggerPicker = useCallback(() => {
    // File picker fallback for non-Tauri environments
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        // PROBE-TEMP START — Channel 1: click picker input probe
        for (const f of files) {
          console.log('[PROBE] click:', 'name=' + (f as any).name, 'typeof path=' + typeof (f as any).path, 'path=' + (f as any).path, 'size=' + (f as any).size)
        }
        // PROBE-TEMP END
        const paths = files.map((f: any) => f.path || f.name)
        uploadFiles(paths)
      }
    }
    input.click()
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

  const uploadFiles = useCallback(
    async (paths: string[]) => {
      try {
        const validPaths = paths.filter(p => {
          return p.startsWith('C:/') || p.startsWith('D:/') || p.startsWith('E:/') || p.startsWith('F:/');
        });
        if (validPaths.length === 0) {
          toast.error(t('errors.invalidPath'))
          return
        }
        // Limit to 10 files per batch
        let limitedPaths = validPaths.slice(0, 10);
        if (limitedPaths.length < validPaths.length) {
          toast.warning(t('dropzone.maxFilesWarning'))
        }
        // Filter by extension: only image and pdf allowed
        const validExtensionPaths = limitedPaths.filter(p => {
          const fileName = p.split('\\').pop()?.split('/').pop() || p;
          return fileKind(fileName) !== 'unknown';
        });
        const extSkippedCount = limitedPaths.length - validExtensionPaths.length;

        // Retrieve file metadata via Rust command to enforce 20MB limit (Tauri-only)
        let sizeSkippedCount = 0;
        if (validExtensionPaths.length > 0 && typeof (window as any).__TAURI__ !== 'undefined') {
          try {
            const metadataList = await invoke<FileMetadata[]>('get_file_metadata_command', {
              paths: validExtensionPaths,
            });
            const validPathsAfterSize: string[] = []
            for (const meta of metadataList) {
              if (!meta.exists || meta.size == null || meta.size > MAX_FILE_SIZE) {
                sizeSkippedCount++
              } else {
                validPathsAfterSize.push(meta.path)
              }
            }
            // Update skipped count to include both extension and size rejections
            const totalSkipped = extSkippedCount + sizeSkippedCount
            if (totalSkipped > 0 && validPathsAfterSize.length === 0) {
              toast.error(t('errors.allInvalid'))
              return
            }
            if (totalSkipped > 0) {
              toast.warning(t('errors.batchSkipped', { total: totalSkipped, unsupported: extSkippedCount, tooLarge: sizeSkippedCount }))
            }
            // Process only files that passed both extension and size checks
            for (const path of validPathsAfterSize) {
              const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              const fileName = path.split('\\').pop()?.split('/').pop() || path;
              addJob({ id: jobId, fileName, fileSize: 0 });
              await uploadFile([path], false);
              onFileAdd?.(fileName);
            }
          } catch (_invokeErr) {
            // If metadata command fails, fall back to extension-only validation
            const totalSkipped = extSkippedCount
            if (totalSkipped > 0 && validExtensionPaths.length === 0) {
              toast.error(t('errors.allInvalid'))
              return
            }
            if (totalSkipped > 0) {
              toast.warning(t('errors.batchSkipped', { total: totalSkipped, unsupported: extSkippedCount, tooLarge: 0 }))
            }
            for (const path of validExtensionPaths) {
              const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              const fileName = path.split('\\').pop()?.split('/').pop() || path;
              addJob({ id: jobId, fileName, fileSize: 0 });
              await uploadFile([path], false);
              onFileAdd?.(fileName);
            }
          }
        } else if (extSkippedCount > 0) {
          // All files failed extension check — one aggregated error toast
          toast.error(t('errors.allInvalid'))
        }
      } catch (error) {
        toast.error(t('errors.uploadFailed'))
      }
    },
    [addJob, onFileAdd, t]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCount(0)

      // Tauri v2 drag-drop provides absolute file paths via event.dataTransfer.files
      const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
      let paths: string[] = [];

      if (isTauri && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // In Tauri v2, File objects have a 'path' property with absolute path
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          if ((file as any).path) {
            paths.push((file as any).path);
          }
          // PROBE-TEMP START — Channel 2: browser drop handler probe
          console.log('[PROBE] drop:', 'name=' + (file as any).name, 'typeof path=' + typeof (file as any).path, 'path=' + (file as any).path, 'size=' + (file as any).size)
          // PROBE-TEMP END
        }
      } else {
        // Fallback for web: extract file names
        const files = Array.from(e.dataTransfer.files);
        paths = files.map(f => f.name);
      }

      if (paths.length > 0) {
        uploadFiles(paths);
      }
    },
    [uploadFiles]
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
      data-testid="dropzone-dashed"
      data-state={isDragOver ? 'drag' : 'idle'}
      className={`w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-4${className ? ` ${className}` : ''} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
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
      <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      <div className="text-center">
        <p className="font-medium">{t('dropzone.dropPrompt')}</p>
        <p className="text-sm text-muted-foreground">{t('dropzone.maxFiles', { count: 10 })}</p>
      </div>
    </div>
  )
}

// Helper function for legacy file input fallback
function uploadFilesFromInput(_files: File[], _onFileAdd?: (fileName: string) => void) {
  // Note: This is a legacy helper; actual upload is handled by the component
}

// Export for legacy compatibility
export { uploadFilesFromInput };