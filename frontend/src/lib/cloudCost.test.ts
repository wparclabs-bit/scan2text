import { describe, expect, it } from 'vitest'

import { estimateCloudCostUsd } from './cloudCost'

const T01_PROFILE_COST = {
  prompt_tokens_per_page: 2167,
  completion_tokens_per_page: 381,
  pages_per_document: 30,
  input_usd_per_million_tokens: 0.2,
  output_usd_per_million_tokens: 0.5,
  estimated_cost_usd: 0.0187,
  measured_on: '2026-11-15',
  basis: 'T01 measured band',
}

describe('estimateCloudCostUsd', () => {
  it('estimate_uses_measured_profile_tokens_and_published_rates', () => {
    expect(estimateCloudCostUsd(T01_PROFILE_COST, 1)).toBeCloseTo(0.018717, 6)
  })

  it('estimate_changes_when_measured_figures_or_rates_change', () => {
    const measuredTokensChanged = {
      ...T01_PROFILE_COST,
      prompt_tokens_per_page: 2168,
    }
    const publishedRateChanged = {
      ...T01_PROFILE_COST,
      input_usd_per_million_tokens: 0.25,
    }

    expect(estimateCloudCostUsd(measuredTokensChanged, 1)).not.toBeCloseTo(
      estimateCloudCostUsd(T01_PROFILE_COST, 1),
      6,
    )
    expect(estimateCloudCostUsd(publishedRateChanged, 1)).not.toBeCloseTo(
      estimateCloudCostUsd(T01_PROFILE_COST, 1),
      6,
    )
  })
})
