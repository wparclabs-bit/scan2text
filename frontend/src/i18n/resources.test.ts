import { describe, it, expect } from 'vitest'
import enResources from '../locales/en.json'
import idResources from '../locales/id.json'

describe('en.json translation resources', () => {
  it('has app.title', () => {
    expect(enResources.app.title).toBe('Scan2Text')
  })

  it('has panels.dropZone', () => {
    expect(enResources.panels.dropZone).toBe('Drop Zone')
  })

  it('has panels.queue', () => {
    expect(enResources.panels.queue).toBe('Queue')
  })

  it('has panels.preview', () => {
    expect(enResources.panels.preview).toBe('Preview')
  })

  it('has status.ready', () => {
    expect(enResources.status.ready).toBe('Ready')
  })

  it('has actions.toggleTheme', () => {
    expect(enResources.actions.toggleTheme).toBe('Toggle theme')
  })

  it('has actions.toggleLanguage', () => {
    expect(enResources.actions.toggleLanguage).toBe('Toggle language')
  })
})

describe('id.json translation resources', () => {
  it('has app.title', () => {
    expect(idResources.app.title).toBe('Scan2Text')
  })

  it('has panels.dropZone', () => {
    expect(idResources.panels.dropZone).toBeDefined()
    expect(typeof idResources.panels.dropZone).toBe('string')
  })

  it('has panels.queue', () => {
    expect(idResources.panels.queue).toBeDefined()
    expect(typeof idResources.panels.queue).toBe('string')
  })

  it('has panels.preview', () => {
    expect(idResources.panels.preview).toBeDefined()
    expect(typeof idResources.panels.preview).toBe('string')
  })

  it('has status.ready', () => {
    expect(idResources.status.ready).toBeDefined()
    expect(typeof idResources.status.ready).toBe('string')
  })

  it('has actions.toggleTheme', () => {
    expect(idResources.actions.toggleTheme).toBeDefined()
    expect(typeof idResources.actions.toggleTheme).toBe('string')
  })

  it('has actions.toggleLanguage', () => {
    expect(idResources.actions.toggleLanguage).toBeDefined()
    expect(typeof idResources.actions.toggleLanguage).toBe('string')
  })
})

describe('en.json translation resources', () => {
  it('has errors.unsupportedFileType', () => {
    expect(enResources.errors.unsupportedFileType).toBe('Unsupported file type. Allowed: PNG, JPG, JPEG, WEBP, PDF')
  })

  it('has errors.fileTooLarge', () => {
    expect(enResources.errors.fileTooLarge).toBe('File exceeds 20MB limit')
  })

  it('has errors.uploadFailed', () => {
    expect(enResources.errors.uploadFailed).toBe('Upload failed')
  })

  it('has queue.empty', () => {
    expect(enResources.queue.empty).toBe('No files in queue')
  })

  it('has queue.status keys', () => {
    expect(enResources.queue.status.pending).toBe('Pending')
    expect(enResources.queue.status.uploading).toBe('Uploading')
    expect(enResources.queue.status.processing).toBe('Processing')
    expect(enResources.queue.status.completed).toBe('Completed')
    expect(enResources.queue.status.failed).toBe('Failed')
  })
})

describe('id.json translation resources', () => {
  it('has errors.unsupportedFileType', () => {
    expect(idResources.errors.unsupportedFileType).toBeDefined()
    expect(typeof idResources.errors.unsupportedFileType).toBe('string')
  })

  it('has errors.fileTooLarge', () => {
    expect(idResources.errors.fileTooLarge).toBeDefined()
    expect(typeof idResources.errors.fileTooLarge).toBe('string')
  })

  it('has errors.uploadFailed', () => {
    expect(idResources.errors.uploadFailed).toBeDefined()
    expect(typeof idResources.errors.uploadFailed).toBe('string')
  })

  it('has queue.empty', () => {
    expect(idResources.queue.empty).toBeDefined()
    expect(typeof idResources.queue.empty).toBe('string')
  })

  it('has queue.status keys', () => {
    expect(typeof idResources.queue.status.pending).toBe('string')
    expect(typeof idResources.queue.status.uploading).toBe('string')
    expect(typeof idResources.queue.status.processing).toBe('string')
    expect(typeof idResources.queue.status.completed).toBe('string')
    expect(typeof idResources.queue.status.failed).toBe('string')
  })
})

describe('translation resource structure', () => {
  const requiredKeys = ['app', 'panels', 'status', 'actions', 'errors', 'queue'] as const

  for (const key of requiredKeys) {
    it(`en.json has key "${key}"`, () => {
      expect(enResources).toHaveProperty(key)
    })

    it(`id.json has key "${key}"`, () => {
      expect(idResources).toHaveProperty(key)
    })
  }

  it('en.json and id.json have matching top-level keys', () => {
    const enKeys = Object.keys(enResources)
    const idKeys = Object.keys(idResources)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching app keys', () => {
    const enKeys = Object.keys(enResources.app)
    const idKeys = Object.keys(idResources.app)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching panels keys', () => {
    const enKeys = Object.keys(enResources.panels)
    const idKeys = Object.keys(idResources.panels)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching status keys', () => {
    const enKeys = Object.keys(enResources.status)
    const idKeys = Object.keys(idResources.status)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching actions keys', () => {
    const enKeys = Object.keys(enResources.actions)
    const idKeys = Object.keys(idResources.actions)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching errors keys', () => {
    const enKeys = Object.keys(enResources.errors)
    const idKeys = Object.keys(idResources.errors)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching queue keys', () => {
    const enKeys = Object.keys(enResources.queue)
    const idKeys = Object.keys(idResources.queue)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json and id.json have matching queue.status keys', () => {
    const enKeys = Object.keys(enResources.queue.status)
    const idKeys = Object.keys(idResources.queue.status)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json has preview keys', () => {
    expect(enResources.preview.emptyState).toBe('Select a completed job to preview the magic.')
    expect(enResources.preview.processing).toBe('Processing document...')
    expect(enResources.preview.failed).toBe('OCR Failed')
    expect(enResources.preview.pdfPlaceholder).toBe('PDF Document')
    expect(enResources.preview.loading).toBe('Processing your file...')
    expect(enResources.preview.error).toBe('Processing failed. Please try again.')
    expect(enResources.preview.retry).toBe('Retry')
  })

  it('id.json has preview keys', () => {
    expect(typeof idResources.preview.emptyState).toBe('string')
    expect(typeof idResources.preview.processing).toBe('string')
    expect(typeof idResources.preview.failed).toBe('string')
    expect(typeof idResources.preview.pdfPlaceholder).toBe('string')
    expect(typeof idResources.preview.loading).toBe('string')
    expect(typeof idResources.preview.error).toBe('string')
    expect(typeof idResources.preview.retry).toBe('string')
  })

  it('en.json and id.json have matching preview keys', () => {
    const enKeys = Object.keys(enResources.preview)
    const idKeys = Object.keys(idResources.preview)
    expect(enKeys).toEqual(idKeys)
  })

  it('en.json has queue.retry', () => {
    expect(enResources.queue.retry).toBe('Retry')
  })

  it('id.json has queue.retry', () => {
    expect(typeof idResources.queue.retry).toBe('string')
  })

  it('en.json and id.json have matching queue keys', () => {
    const enKeys = Object.keys(enResources.queue)
    const idKeys = Object.keys(idResources.queue)
    expect(enKeys).toEqual(idKeys)
  })
})
