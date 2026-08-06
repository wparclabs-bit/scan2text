import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 h-full grid grid-cols-[20%_20%_60%] overflow-hidden p-3 gap-3">
        <DropZonePanel />
        <QueuePanel />
        <PreviewPanel />
      </main>
      <BottomStatusBar />
    </div>
  )
}
