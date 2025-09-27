import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-openai-key'
}

if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://test.supabase.co'
}

if (!process.env.SUPABASE_KEY) {
  process.env.SUPABASE_KEY = 'test-supabase-key'
}

type ClipboardMock = {
  writeText: ReturnType<typeof vi.fn>
}

const clipboardMock: ClipboardMock = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

Object.defineProperty(navigator, 'clipboard', {
  value: clipboardMock,
  writable: true,
  configurable: true,
})

beforeEach(() => {
  clipboardMock.writeText.mockClear()
})
