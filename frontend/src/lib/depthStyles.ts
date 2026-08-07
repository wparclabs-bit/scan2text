export type DepthPanel = 'left' | 'center' | 'right'

interface DepthStyleArgs {
  theme: 'dark' | 'light'
  panel: DepthPanel
}

export function getDepthStyle({ theme, panel }: DepthStyleArgs): React.CSSProperties {
  const isDark = theme === 'dark'

  const recipes: Record<DepthPanel, { bg: string; shadow: string }> = {
    left: isDark
      ? {
          bg: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%, rgba(31,21,12,0.10))',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.35)',
        }
      : {
          bg: 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0) 40%, rgba(31,21,12,0.10))',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 8px 20px rgba(31,21,12,0.22)',
        },
    center: isDark
      ? {
          bg: 'linear-gradient(180deg, rgba(227,165,95,0.18), rgba(0,0,0,0.25))',
          shadow: 'inset 0 1px 0 rgba(242,235,221,0.12), 0 10px 24px rgba(0,0,0,0.45)',
        }
      : {
          bg: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 40%, rgba(31,21,12,0.12))',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 24px rgba(31,21,12,0.25)',
        },
    right: isDark
      ? {
          bg: 'linear-gradient(180deg, rgba(227,165,95,0.10), rgba(0,0,0,0.30))',
          shadow: 'inset 0 1px 0 rgba(242,235,221,0.08), 0 10px 24px rgba(0,0,0,0.5)',
        }
      : {
          bg: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 40%, rgba(31,21,12,0.15))',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 24px rgba(31,21,12,0.28)',
        },
  }

  const baseColors: Record<DepthPanel, { light: string; dark: string }> = {
    left: { light: '#EFE9E3', dark: '#E1DCC9' },
    center: { light: '#D9CFC7', dark: '#412D15' },
    right: { light: '#C9B59C', dark: '#1F150C' },
  }

  const recipe = recipes[panel]
  const baseColor = isDark ? baseColors[panel].dark : baseColors[panel].light

  return {
    backgroundColor: baseColor,
    backgroundImage: recipe.bg,
    boxShadow: recipe.shadow,
  }
}
