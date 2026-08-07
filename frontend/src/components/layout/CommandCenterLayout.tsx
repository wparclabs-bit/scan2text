import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 h-full grid grid-cols-[2fr_2fr_6fr] overflow-hidden p-3 gap-3 workspace-container">
        <div className="h-full min-w-0 overflow-hidden">
          <DropZonePanel />
        </div>
        <div className="relative h-full min-w-0 overflow-hidden" data-testid="center-panel">
          <div data-testid="ambient-glow" aria-hidden="true" data-state="static" className="pointer-events-none absolute inset-0" />
          <div
            data-testid="center-radiant-rays"
            aria-hidden="true"
            data-state="static"
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            <svg
              viewBox="0 0 400 600"
              preserveAspectRatio="none"
              className="w-full h-full opacity-10 dark:opacity-15"
            >
              <defs>
                <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1="200"
                  y1="0"
                  x2={200 + Math.cos((i * 30 * Math.PI) / 180) * 300}
                  y2={Math.sin((i * 30 * Math.PI) / 180) * 300 + 300}
                  stroke="url(#rayGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
          <div className="relative h-full min-w-0 overflow-hidden">
            <QueuePanel />
          </div>
        </div>
        <div className="h-full min-w-0 overflow-hidden">
          <PreviewPanel />
        </div>
      </main>
      <BottomStatusBar />
    </div>
  )
}
