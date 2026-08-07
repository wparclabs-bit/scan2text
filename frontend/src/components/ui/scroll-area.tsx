import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Corner />
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      className="flex touch-none select-none transition-colors h-10 w-1.5 data-[orientation=vertical]:w-1.5"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-transparent" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Scrollbar
      orientation="horizontal"
      className="flex touch-none select-none transition-colors h-1.5 data-[orientation=horizontal]:h-1.5"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-transparent" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-10 w-1.5',
      orientation === 'horizontal' && 'h-1.5 flex-col',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-transparent" />
  </ScrollAreaPrimitive.Scrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.Scrollbar.displayName

export { ScrollArea, ScrollBar }
