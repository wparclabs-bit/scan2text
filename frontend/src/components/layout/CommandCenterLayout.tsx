import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 h-full grid grid-cols-[2fr_2fr_6fr] overflow-hidden p-3 gap-3">
        <div className="h-full">
          <DropZonePanel />
        </div>
        <div className="h-full">
          <QueuePanel />
        </div>
        <div className="h-full">
          <PreviewPanel />
        </div>
      </main>
      <BottomStatusBar />
    </div>
  )
}
