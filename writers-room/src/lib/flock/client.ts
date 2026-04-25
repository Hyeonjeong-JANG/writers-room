import OpenAI from 'openai'

export function createFlockClient() {
  const apiKey = process.env.FLOCK_API_KEY
  const baseURL = process.env.FLOCK_API_BASE_URL || 'https://api.flock.io/v1'

  if (!apiKey) {
    throw new Error('FLOCK_API_KEY is required')
  }

  return new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: {
      'x-litellm-api-key': apiKey,
    },
  })
}

export const getDefaultModel = () => process.env.FLOCK_DEFAULT_MODEL || ''
