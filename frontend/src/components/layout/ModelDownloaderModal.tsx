import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildApiUrl } from '@/lib/apiBase'

interface DownloadState {
  status: 'idle' | 'downloading' | 'verifying' | 'complete' | 'failed' | 'cancelled'
  bytes_downloaded: number
  total_bytes: number
  error_message?: string | null
}

interface ModelDownloaderModalProps {
  open: boolean
  onClose: () => void
}

export default function ModelDownloaderModal({ open, onClose }: ModelDownloaderModalProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<DownloadState>({
    status: 'idle',
    bytes_downloaded: 0,
    total_bytes: 0,
  })

  useEffect(() => {
    if (!open) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const pollProgress = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/download/progress?t=${Date.now()}`))
        const data: DownloadState = await res.json()
        setState(data)

        if (data.status === 'complete') {
          if (intervalId) clearInterval(intervalId)
          onClose()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          // Keep polling briefly then stop — user sees restart button.
          if (intervalId) clearInterval(intervalId)
        }
      } catch (err) {
        console.error('Downloader error:', err);
      }
    }

    void pollProgress()
    intervalId = setInterval(pollProgress, 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [open, onClose])

  const handleCancel = async () => {
    try {
      await fetch(buildApiUrl('/api/download/cancel'), { method: 'POST' })
    } catch (err) {
      console.error('Downloader error:', err);
    }
  }

  const handleRestart = async () => {
    try {
      await fetch(buildApiUrl('/api/download/start'), { method: 'POST' })
    } catch (err) {
      console.error('Downloader error:', err);
    }
  }

  if (!open) return null

  const percentage = state.total_bytes > 0
    ? Math.round((state.bytes_downloaded / state.total_bytes) * 100)
    : 0

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div
      data-testid="model-downloader-modal"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
    >
      <div className="bg-[#1F150C] dark:bg-[#1F150C] light:bg-[#C9B59C] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-bold text-[#F2EBDD] mb-2">{t('downloader.title')}</h2>
        <p className="text-sm text-[#F2EBDD]/70 mb-6">
          {state.status === 'verifying'
            ? t('downloader.verifying')
            : t('downloader.description')}
        </p>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#F2EBDD]/60 mb-1">
            <span>{t('downloader.progress', { downloaded: formatBytes(state.bytes_downloaded), total: formatBytes(state.total_bytes) })}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-[#3B2A18] rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: state.status === 'failed' ? '#DC2626' : '#E3A55F',
              }}
            />
          </div>
        </div>

        {state.error_message && (
          <p className="text-xs text-red-400 mb-4">{state.error_message}</p>
        )}

        {(state.status === 'failed' || state.status === 'cancelled') && (
          <p className="text-sm text-[#F2EBDD]/80 mb-4">{t('downloader.failed')}</p>
        )}

        <div className="flex gap-3 mt-6">
          {(state.status === 'downloading' || state.status === 'verifying') && (
            <button
              data-testid="download-cancel-btn"
              onClick={handleCancel}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium border border-[#3B2A18] text-[#F2EBDD]/70 hover:bg-[#3B2A18] transition-colors"
            >
              {t('downloader.cancel')}
            </button>
          )}
          {(state.status === 'failed' || state.status === 'cancelled') && (
            <button
              data-testid="download-restart-btn"
              onClick={handleRestart}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-[#E3A55F] text-[#1F150C] hover:bg-[#d4944e] transition-colors"
            >
              {t('downloader.restart')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
