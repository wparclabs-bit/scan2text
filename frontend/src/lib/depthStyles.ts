export type DepthPanel = 'left' | 'center' | 'right'

interface DepthStyleArgs {
  theme: 'dark' | 'light'
  panel: DepthPanel
}

export function getDepthStyle({ theme, panel }: DepthStyleArgs): React.CSSProperties {
  const isDark = theme === 'dark'

  const overlays: Record<DepthPanel, { color: string; shadow: string }> = {
    left: isDark
      ? { color: 'rgba(31,21,12,0.12)', shadow: '0 8px 20px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { color: 'rgba(31,21,12,0.07)', shadow: '0 8px 20px -8px rgba(31,21,12,0.22), inset 0 1px 0 rgba(255,255,255,0.65)' },
    center: isDark
      ? { color: 'rgba(0,0,0,0.22)', shadow: '0 8px 20px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { color: 'rgba(31,21,12,0.07)', shadow: '0 8px 20px -8px rgba(31,21,12,0.22), inset 0 1px 0 rgba(255,255,255,0.65)' },
    right: isDark
      ? { color: 'rgba(0,0,0,0.28)', shadow: '0 8px 20px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { color: 'rgba(31,21,12,0.07)', shadow: '0 8px 20px -8px rgba(31,21,12,0.22), inset 0 1px 0 rgba(255,255,255,0.65)' },
  }

  const baseColors: Record<DepthPanel, { light: string; dark: string }> = {
    left: { light: '#EFE9E3', dark: '#E1DCC9' },
    center: { light: '#D9CFC7', dark: '#412D15' },
    right: { light: '#C9B59C', dark: '#1F150C' },
  }

  const topStops: Record<DepthPanel, { light: string; dark: string }> = {
    left: { light: '#F7F2EC', dark: '#EDE8D8' },
    center: { light: '#E2D9D0', dark: '#4D3619' },
    right: { light: '#D2BFA8', dark: '#2A1C10' },
  }

  const overlay = overlays[panel]
  const baseColor = isDark ? baseColors[panel].dark : baseColors[panel].light
  const topStop = isDark ? topStops[panel].dark : topStops[panel].light

  return {
    backgroundColor: baseColor,
    backgroundImage: `linear-gradient(to bottom, ${topStop} 0%, ${baseColor} 100%), linear-gradient(to bottom, ${overlay.color}, transparent 45%)`,
    boxShadow: overlay.shadow,
  }
}
