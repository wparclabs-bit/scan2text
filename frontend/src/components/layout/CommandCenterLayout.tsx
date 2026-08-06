import TopBar from './TopBar'
import BottomStatusBar from './BottomStatusBar'
import DropZonePanel from './panels/DropZonePanel'
import QueuePanel from './panels/QueuePanel'
import PreviewPanel from './panels/PreviewPanel'

export default function CommandCenterLayout() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 h-full grid grid-cols-[20%_35%_45%] overflow-hidden">
        <DropZonePanel />
        <div className="border-r border-border">
          <QueuePanel />
        </div>
        <PreviewPanel />
      </main>
      <BottomStatusBar />
    </div>
  )
}
