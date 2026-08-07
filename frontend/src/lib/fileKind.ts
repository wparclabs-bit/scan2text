export type FileKind = 'image' | 'pdf' | 'unknown'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const PDF_EXTENSION = 'pdf'

export function fileKind(fileName: string): FileKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (ext === PDF_EXTENSION) return 'pdf'
  return 'unknown'
}
