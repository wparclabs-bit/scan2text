import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TopBar from './TopBar'

// Translation map used by the mock
const translations: Record<string, Record<string, string>> = {
  en: {
    'actions.toggleTheme': 'Toggle theme',
    'actions.toggleLanguage': 'Toggle language',
    'actions.themeTooltipDark': 'Switch to light mode',
    'actions.themeTooltipLight': 'Switch to dark mode',
    'actions.langTooltipEn': 'Switch to Bahasa',
    'actions.langTooltipId': 'Switch to English',
    'actions.settingsTooltip': 'Open settings',
    'actions.shareTooltip': 'Share app link',
    'topbar.logoAlt': 'Scan2Text logo',
    'topbar.brandAlt': 'Scan2Text',
    'topbar.demoBadge': 'DEMO',
    'settings.title': 'Settings',
  },
  id: {
    'actions.toggleTheme': 'Ubah tema',
    'actions.toggleLanguage': 'Ubah bahasa',
    'actions.themeTooltipDark': 'Beralih ke mode terang',
    'actions.themeTooltipLight': 'Beralih ke mode gelap',
    'actions.langTooltipEn': 'Beralih ke Bahasa Indonesia',
    'actions.langTooltipId': 'Beralih ke Bahasa Inggris',
    'actions.settingsTooltip': 'Buka pengaturan',
    'actions.shareTooltip': 'Bagikan tautan aplikasi',
    'topbar.logoAlt': 'Logo Scan2Text',
    'topbar.brandAlt': 'Scan2Text',
    'topbar.demoBadge': 'DEMO',
    'settings.title': 'Pengaturan',
  },
}

const mockToggleTheme = vi.fn()
const mockToggleLanguage = vi.fn()

let mockState = {
  theme: 'dark',
  language: 'en',
  toggleTheme: mockToggleTheme,
  toggleLanguage: mockToggleLanguage,
}

vi.mock('../../stores/preferencesStore', () => {
  const store = {
    getState: () => mockState,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useStore = (selector: any) => selector(store.getState())
  useStore.getState = store.getState.bind(store)
  return { usePreferenceStore: useStore }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string) => {
      const lng = mockState.language
      return translations[lng]?.[key] ?? key
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}))

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = {
      theme: 'dark',
      language: 'en',
      toggleTheme: mockToggleTheme,
      toggleLanguage: mockToggleLanguage,
    }
  })

  it('renders settings trigger button with data-testid="settings-trigger"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('settings-trigger')).toBeInTheDocument()
  })

  it('clicking settings trigger opens the SettingsDialog', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByTestId('settings-trigger'))
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not open dialog on other button clicks', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders logo chip with data-testid="topbar-logo-chip"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('topbar-logo-chip')).toBeInTheDocument()
  })

  it('logo chip uses logo.png image', () => {
    render(<TopBar />)
    const img = screen.getByTestId('topbar-logo-chip').querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.src).toContain('logo.png')
  })

  it('renders brand image with alt="Scan2Text"', () => {
    render(<TopBar />)
    const brandImg = screen.getByAltText('Scan2Text')
    expect(brandImg).toBeInTheDocument()
    expect(brandImg).toHaveAttribute('src')
    expect((brandImg as HTMLImageElement).src).toContain('text.png')
  })

  it('does not render DEMO badge when demo mode is disabled', () => {
    render(<TopBar />)
    expect(screen.queryByTestId('topbar-demo-badge')).not.toBeInTheDocument()
  })

  it('logo has accessible aria-label', () => {
    render(<TopBar />)
    const logoChip = screen.getByTestId('topbar-logo-chip')
    expect(logoChip).toHaveAttribute('aria-label', 'Scan2Text logo')
  })

  it('header has h-[34px] height class', () => {
    render(<TopBar />)
    const header = screen.getByTestId('top-bar')
    expect(header).toHaveClass('h-[34px]')
  })

  it('header does not have border-b class', () => {
    render(<TopBar />)
    const header = screen.getByTestId('top-bar')
    expect(header).not.toHaveClass('border-b')
  })

  it('lockup chip does not have pill/border wrapper classes', () => {
    render(<TopBar />)
    const chip = screen.getByTestId('topbar-logo-chip')
    expect(chip).not.toHaveClass('border')
    expect(chip).not.toHaveClass('bg-card')
    expect(chip).toHaveClass('chip-tile')
  })

  it('does not render wordmark span elements', () => {
    render(<TopBar />)
    expect(screen.queryByTestId('topbar-wordmark')).not.toBeInTheDocument()
    expect(screen.queryByTestId('topbar-wordmark-accent')).not.toBeInTheDocument()
  })

  it('brand glow element exists with data-testid="brand-glow"', () => {
    render(<TopBar />)
    const glow = screen.getByTestId('brand-glow')
    expect(glow).toBeInTheDocument()
  })

  it('brand glow has static radial-gradient style in dark theme', () => {
    render(<TopBar />)
    const glow = screen.getByTestId('brand-glow') as HTMLElement
    const style = glow.getAttribute('style') ?? ''
    expect(style).toContain('radial-gradient')
    expect(style).toContain('rgba')
  })

  it('language toggle button has data-testid="language-toggle"', () => {
    render(<TopBar />)
    expect(screen.getByTestId('language-toggle')).toBeInTheDocument()
  })

  it('language tooltip shows target-language text when language is en', () => {
    mockState = {
      theme: 'dark',
      language: 'en',
      toggleTheme: mockToggleTheme,
      toggleLanguage: mockToggleLanguage,
    }
    render(<TopBar />)
    const tooltips = screen.getAllByRole('tooltip', { hidden: true })
    // 3 tooltips: theme, language, settings
    expect(tooltips.length).toBe(3)
    const texts = tooltips.map((tp) => (tp.textContent ?? '').trim())
    expect(texts).toContain(translations.en['actions.langTooltipEn'])
  })

  it('language tooltip shows target-language text when language is id', () => {
    mockState = {
      theme: 'dark',
      language: 'id',
      toggleTheme: mockToggleTheme,
      toggleLanguage: mockToggleLanguage,
    }
    render(<TopBar />)
    const tooltips = screen.getAllByRole('tooltip', { hidden: true })
    expect(tooltips.length).toBe(3)
    const texts = tooltips.map((tp) => (tp.textContent ?? '').trim())
    expect(texts).toContain(translations.id['actions.langTooltipId'])
  })
})
