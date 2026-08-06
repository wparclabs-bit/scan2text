import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useScan2TextStore } from '../stores/scan2text.store'

interface DropZoneProps {
  onFileAdd?: (fileName: string) => void
}

export default function DropZone({ onFileAdd }: DropZoneProps) {
  const jobs = useScan2TextStore((state) => state.jobs)
  const startUpload = useScan2TextStore((state) => state.startUpload)
  const pollJob = useScan2TextStore((state) => state.pollJob)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileAdd?.(file.name)
      const jobId = await startUpload({ file })
      void pollJob({ jobId })
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const droppedFiles = Array.from(event.dataTransfer.files)
    if (droppedFiles.length === 0) return

    for (const file of droppedFiles) {
      onFileAdd?.(file.name)
      const jobId = await startUpload({ file })
      void pollJob({ jobId })
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const sortedJobs = Object.values(jobs).sort((a, b) => a.createdAt - b.createdAt)

  return (
    <Card
      className="w-full max-w-2xl mx-auto"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Upload file"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
              Choose File
            </span>
          </label>
          <span className="text-sm text-muted-foreground">
            or drag and drop files here
          </span>
        </div>

        {sortedJobs.length > 0 && (
          <div className="space-y-3 mt-4">
            {sortedJobs.map((job) => (
              <div
                key={job.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  job.status === 'failed' ? 'border-red-500 bg-red-50' : 'bg-card'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.fileName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {job.status}
                    {job.taskId && ` · ${job.taskId}`}
                  </p>
                  {job.error && (
                    <p className="text-xs text-red-500">{job.error}</p>
                  )}
                  {job.resultMarkdown && (
                    <p className="text-xs text-green-600">Completed</p>
                  )}
                </div>
                <div className="w-32">
                  <div
                    role="progressbar"
                    aria-valuenow={job.status === 'completed' ? 100 : job.status === 'failed' ? 0 : 50}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 bg-muted rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${job.status === 'completed' ? 100 : job.status === 'processing' || job.status === 'uploading' ? 50 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
