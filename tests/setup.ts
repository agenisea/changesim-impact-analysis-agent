import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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
