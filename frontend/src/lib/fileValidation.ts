const MAX_FILE_SIZE = 50 * 1024 * 1024

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf']

export type ValidationReason = 'unsupported' | 'tooLarge'

export interface ValidationResult {
  valid: boolean
  error?: string
  reason?: ValidationReason
}

export interface SkippedFile {
  fileName: string
  size: number
  reason: ValidationReason
}

export interface BatchValidationResult {
  validFiles: File[]
  skippedFiles: SkippedFile[]
}

function checkFileType(file: File): boolean {
  const mimeType = file.type.toLowerCase().trim()
  const hasAllowedMime =
    mimeType !== '' && ALLOWED_MIME_TYPES.includes(mimeType)

  const extMatch = file.name.match(/\.[^.]+$/)
  const ext = extMatch ? extMatch[0].toLowerCase() : ''
  const hasAllowedExt = ALLOWED_EXTENSIONS.includes(ext)

  return hasAllowedMime || hasAllowedExt
}

export function validateFile(file: File): ValidationResult {
  if (!checkFileType(file)) {
    return { valid: false, error: 'Invalid file type. Allowed: PNG, JPG, JPEG, WEBP, PDF', reason: 'unsupported' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds 50MB limit', reason: 'tooLarge' }
  }

  return { valid: true }
}

export function validateFilesBatch(files: File[]): BatchValidationResult {
  const validFiles: File[] = []
  const skippedFiles: SkippedFile[] = []

  for (const file of files) {
    const result = validateFile(file)
    if (result.valid) {
      validFiles.push(file)
    } else {
      skippedFiles.push({
        fileName: file.name,
        size: file.size,
        reason: result.reason ?? 'unsupported',
      })
    }
  }

  return { validFiles, skippedFiles }
}
