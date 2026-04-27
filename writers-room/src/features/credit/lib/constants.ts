export const CREDIT_COSTS = {
  START_DISCUSSION: 10,
  SUBMIT_FEEDBACK: 4,
  GENERATE_CHAPTER: 1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export const FREE_CREDITS_PER_MONTH = 50
