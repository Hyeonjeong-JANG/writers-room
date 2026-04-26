import OpenAI from 'openai'

export function createAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }

  return new OpenAI({ apiKey })
}

export const getDefaultModel = () => process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini'
