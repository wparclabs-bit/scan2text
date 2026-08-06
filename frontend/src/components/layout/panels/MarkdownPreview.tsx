import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  markdown: string
}

export default function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <article data-testid="preview-markdown" className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
      {markdown ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground text-sm">No output yet</p>
      )}
    </article>
  )
}
