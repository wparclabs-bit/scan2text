import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const IMG_TAG_RE = new RegExp('<img[^>]*\\/?>', 'gi')

interface MarkdownPreviewProps {
  markdown: string
}

export default function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  // Strip raw <img ...> tags from the display string only.
  // The raw content prop stays untouched so saved .md preserves chart crops.
  const display = markdown ? markdown.replace(IMG_TAG_RE, '') : ''

  return (
    <article data-testid="preview-markdown" className="prose prose-base prose-compact dark:prose-invert max-w-none text-foreground prose-headings:font-display prose-a:text-primary hover:prose-a:text-primary/80 min-w-0">
      {display ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children, ...props }) => (
              <div data-testid="md-table-scroll" className="overflow-x-auto max-w-full">
                <table {...props}>{children}</table>
              </div>
            ),
          }}
        >
          {display}
        </ReactMarkdown>
      ) : (
        <p className="text-muted-foreground text-sm">No output yet</p>
      )}
    </article>
  )
}
