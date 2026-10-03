import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock axios
vi.mock('@/utils/axios', () => ({
  default: {
    put: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock toastify
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('useOptimisticNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export expected methods', async () => {
    const { useOptimisticNotes } = await import('@/hooks/useOptimisticNotes')
    
    // Just check the function exists and is callable
    expect(typeof useOptimisticNotes).toBe('function')
  })
})
