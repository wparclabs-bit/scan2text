import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div data-testid="app-shell" className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="shrink-0">
        <TopBar />
      </div>
      <main
        data-testid="main-content"
        className="flex-1 min-h-0 min-w-0 w-full grid grid-cols-[minmax(0,34fr)_minmax(0,60fr)] gap-[2%] px-4 pb-3"
      >
        <div data-testid="left-column" className="min-h-0 min-w-0 grid grid-rows-[minmax(0,38fr)_minmax(0,62fr)] gap-3">
          <DropZonePanel />
          <QueuePanel />
        </div>
        <div data-testid="preview-column" className="min-h-0 min-w-0">
          <PreviewPanel />
        </div>
      </main>
      <BottomStatusBar />
    </div>
  )
}
