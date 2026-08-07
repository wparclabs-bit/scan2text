import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 min-h-0 h-full grid grid-cols-[34fr_60fr] gap-[2%] p-[2%] workspace-container">
        <div className="h-full min-w-0 flex flex-col gap-[2%]">
          <div className="h-[38%] min-h-[240px] min-w-0">
            <DropZonePanel />
          </div>
          <div className="flex-1 min-h-0 min-w-0" data-testid="center-panel">
            <div
              data-testid="ambient-glow"
              aria-hidden="true"
              data-state="static"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(60% 50% at 50% 0%, hsl(var(--accent) / 0.16), transparent 70%)',
                backgroundColor: 'transparent',
              }}
            />
            <div className="relative h-full min-w-0 overflow-hidden">
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
                      <stop offset="0%" stopColor="#E3A55F" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#E3A55F" stopOpacity="0" />
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
              <QueuePanel />
            </div>
          </div>
        </div>
        <div className="h-full min-w-0">
          <PreviewPanel />
        </div>
      </main>
      <BottomStatusBar />
    </div>
  )
}
