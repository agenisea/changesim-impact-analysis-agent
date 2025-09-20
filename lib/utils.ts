import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

export type RetryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getDelayMs = (base: number, attempt: number) => {
  const exponential = base * Math.pow(2, attempt)
  const jitter = Math.random() * base
  return exponential + jitter
}

export async function retryFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 300

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init)

      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts - 1) {
        return response
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
    }

    const delay = getDelayMs(baseDelayMs, attempt)
    await sleep(delay)
  }

  throw new Error("retryFetch reached an unexpected state")
}
