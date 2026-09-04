import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/webview'

import { useScan2TextStore } from '@/stores/scan2text.store'
import { uploadFile } from '@/lib/api'
import { fileKind } from '@/lib/fileKind'
import { pickFilesViaDialog } from '@/lib/filePicker'

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

/**
 * Pure function for validating and processing dropped file paths.
 * Accepts optional dependencies for testability; uses module-level defaults otherwise.
 */
export async function handleDroppedPaths(
  paths: string[],
  deps: {
    addJob: (job: any) => void,
    t: (key: string, params?: any) => string,
    onFileAdd?: (fileName: string) => void,
  } = {} as any
) {
  const { addJob, t, onFileAdd } = deps

  // Normalize slashes: accept both C:\ and C:/ drive prefixes
  const validPaths = paths.filter(p => {
    const normalized = p.replace(/\\/g, '/');
    return normalized.startsWith('C:/') || normalized.startsWith('D:/') || normalized.startsWith('E:/') || normalized.startsWith('F:/');
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
    let metadataList: FileMetadata[] | null = null;
    try {
      metadataList = await invoke<FileMetadata[]>('get_file_metadata_command', {
        paths: validExtensionPaths,
      });
    } catch (_invokeErr) {
      // fall through — will use extension-only validation below
    }

    if (metadataList) {
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
    } else {
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
}

export default function FileDropZone({ onFileAdd, className }: FileDropZoneProps) {
  const [dragCount, setDragCount] = useState(0)
  const isDragOver = dragCount > 0
  const addJob = useScan2TextStore((s) => s.addJob)
  const { t } = useTranslation()

  // Wire tauri://drag-drop event listener using Tauri v2 native API
  // PROBE-TEMP START — Channel 3: tauri://drag-drop event probe (getCurrentWindow)
  useEffect(() => {
    const window = getCurrentWindow()
    const unlistenPromise = window.onDragDropEvent((event: any) => {
      console.log('[PROBE] tauri drop:', JSON.stringify(event.payload))
      if (event.payload.type === 'drop' && Array.isArray(event.payload.paths)) {
        handleDroppedPaths(event.payload.paths, { addJob, t, onFileAdd })
      }
    })
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  }, [addJob, t, onFileAdd])
  // PROBE-TEMP END

  const triggerPicker = useCallback(() => {
    pickFilesViaDialog().then((paths: string[] | null) => {
      if (paths !== null && paths.length > 0) {
        handleDroppedPaths(paths, { addJob, t, onFileAdd })
      }
      // null = user cancelled — no-op
    })
  }, [addJob, t, onFileAdd])



  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        triggerPicker()
      }
    },
    [triggerPicker],
  )



  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCount(0)
      // Browser drop handler neutralized — paths come via tauri://drag-drop event instead
    },
    []
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