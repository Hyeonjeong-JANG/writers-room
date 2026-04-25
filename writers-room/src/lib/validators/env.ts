import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // FLock API
  FLOCK_API_KEY: z.string().min(1),
  FLOCK_API_BASE_URL: z.string().url().default('https://api.flock.io/v1'),
  FLOCK_DEFAULT_MODEL: z.string().min(1),

  // Selanet
  SELANET_API_KEY: z.string().optional(),
  SELANET_API_BASE_URL: z.string().url().optional(),

  // Nansen
  NANSEN_API_BASE_URL: z.string().url().default('https://api.nansen.ai'),
  NANSEN_X402_WALLET_KEY: z.string().optional(),

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
