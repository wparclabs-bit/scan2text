/**
 * D-29 / D-35: cloud output carries YAML provenance front matter. The Markdown
 * file on disk keeps it; human-facing surfaces (Preview body, Copy Markdown)
 * show only the body.
 */
const PROVENANCE_KEYS = ['engine', 'model', 'prompt_version', 'pages', 'generated_at'] as const

/**
 * Removes the leading provenance block from a Markdown document when, and only
 * when, it is real front matter: the document starts with `---`, the next line
 * that is exactly `---` closes the block, and the block carries every
 * provenance key. Anything else (a horizontal rule in the body, a rule at the
 * top of the document) is returned untouched.
 */
export function stripProvenanceFrontMatter(markdown: string): string {
  if (!markdown) return markdown

  const lines = markdown.split(/\r?\n/)
  if (lines[0] !== '---') return markdown

  let closingIndex = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      closingIndex = index
      break
    }
  }
  if (closingIndex === -1) return markdown

  const block = lines.slice(1, closingIndex)
  const carriesProvenance = PROVENANCE_KEYS.every((key) =>
    block.some((line) => line.startsWith(`${key}:`)),
  )
  if (!carriesProvenance) return markdown

  let bodyStart = closingIndex + 1
  if (lines[bodyStart] === '') bodyStart += 1

  return lines.slice(bodyStart).join('\n')
}
