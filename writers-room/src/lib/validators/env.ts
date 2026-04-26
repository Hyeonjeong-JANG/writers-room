import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_DEFAULT_MODEL: z.string().default('gpt-4o-mini'),

  // Base
  NEXT_PUBLIC_BASE_CHAIN_ID: z.string().default('8453'),
  NEXT_PUBLIC_COINBASE_PROJECT_ID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }
  return parsed.data
}
