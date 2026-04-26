import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAIClient, getDefaultModel, withRetry } from '../client'

// OpenAI 생성자 모킹
vi.mock('openai', () => {
  return {
    default: function OpenAI(this: { apiKey: string }, opts: { apiKey: string }) {
      this.apiKey = opts.apiKey
    },
  }
})

describe('createAIClient', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('OPENAI_API_KEY가 없으면 에러를 던진다', () => {
    delete process.env.OPENAI_API_KEY
    expect(() => createAIClient()).toThrow('OPENAI_API_KEY is required')
  })

  it('OPENAI_API_KEY가 있으면 OpenAI 인스턴스를 반환한다', () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const client = createAIClient()
    expect(client).toBeDefined()
    expect(client.apiKey).toBe('test-key')
  })
})

describe('getDefaultModel', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('OPENAI_DEFAULT_MODEL이 설정되면 해당 값을 반환한다', () => {
    process.env.OPENAI_DEFAULT_MODEL = 'gpt-4o'
    expect(getDefaultModel()).toBe('gpt-4o')
  })

  it('OPENAI_DEFAULT_MODEL이 없으면 gpt-4o-mini를 반환한다', () => {
    delete process.env.OPENAI_DEFAULT_MODEL
    expect(getDefaultModel()).toBe('gpt-4o-mini')
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('첫 시도에 성공하면 바로 결과를 반환한다', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { baseDelayMs: 100 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('429 에러는 재시도한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limit' })
      .mockResolvedValue('ok')

    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 2 })
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('500 에러는 재시도한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: 'server error' })
      .mockResolvedValue('ok')

    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 2 })
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('네트워크 에러(status 없음)는 재시도한다', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValue('ok')

    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 2 })
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('400 에러는 재시도하지 않고 바로 던진다', async () => {
    const error = { status: 400, message: 'bad request' }
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn, { baseDelayMs: 100, maxRetries: 2 })).rejects.toEqual(error)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('maxRetries 초과 시 마지막 에러를 던진다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = { status: 429, message: 'rate limit' }
    const fn = vi.fn().mockRejectedValue(error)

    // .catch()를 즉시 연결하여 unhandled rejection ��지
    let caughtError: unknown
    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 1 }).catch((e) => {
      caughtError = e
    })

    await vi.advanceTimersByTimeAsync(200)
    await promise

    expect(caughtError).toEqual(error)
    expect(fn).toHaveBeenCalledTimes(2) // initial + 1 retry
    warnSpy.mockRestore()
  })

  it('지수 백오프: 재시도 간격이 2배씩 증가한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue('ok')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 2 })

    // 1st retry: 100ms * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100)
    // 2nd retry: 100ms * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200)

    const result = await promise
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    warnSpy.mockRestore()
  })

  it('label 옵션이 경고 메시지에 포함된다', async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValue('ok')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const promise = withRetry(fn, { baseDelayMs: 100, maxRetries: 2, label: 'test-call' })
    await vi.advanceTimersByTimeAsync(100)
    await promise

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[test-call]'))
    warnSpy.mockRestore()
  })
})
