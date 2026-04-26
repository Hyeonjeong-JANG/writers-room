import OpenAI from 'openai'

export function createAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }

  return new OpenAI({ apiKey })
}

export const getDefaultModel = () => process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini'

/**
 * 지수 백오프 재시도 유틸.
 * 429(레이트 리밋)와 5xx 에러에 대해 재시도합니다.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, label = 'AI call' } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLast = attempt === maxRetries
      const status = (error as { status?: number }).status

      // 재시도 가능한 에러: 429(레이트 리밋), 500+, 네트워크 에러
      const isRetryable = status === 429 || (status !== undefined && status >= 500) || !status

      if (isLast || !isRetryable) {
        throw error
      }

      const delay = baseDelayMs * Math.pow(2, attempt)
      console.warn(
        `[${label}] attempt ${attempt + 1} failed (status: ${status ?? 'unknown'}), retrying in ${delay}ms...`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error(`[${label}] unreachable`)
}
