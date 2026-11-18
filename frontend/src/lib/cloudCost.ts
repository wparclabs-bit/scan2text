export interface CloudCostBasis {
  prompt_tokens_per_page: number
  completion_tokens_per_page: number
  pages_per_document: number
  input_usd_per_million_tokens: number
  output_usd_per_million_tokens: number
}

const TOKENS_PER_MILLION = 1_000_000

/**
 * Estimate Cloud cost from the Profile's measured token figures and its
 * published rates. The stored total is intentionally not an input: changing a
 * measured figure or a published rate changes the estimate.
 */
export function estimateCloudCostUsd(
  basis: CloudCostBasis,
  documentCount = 1,
): number {
  const documents = Math.max(0, documentCount)
  const totalPages = basis.pages_per_document * documents
  const promptTokens = totalPages * basis.prompt_tokens_per_page
  const completionTokens = totalPages * basis.completion_tokens_per_page

  return (
    (promptTokens * basis.input_usd_per_million_tokens +
      completionTokens * basis.output_usd_per_million_tokens) /
    TOKENS_PER_MILLION
  )
}
