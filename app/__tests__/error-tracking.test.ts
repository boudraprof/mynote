import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock navigator
vi.stubGlobal('navigator', {
  userAgent: 'test-agent',
})

describe('error-tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export expected functions', async () => {
    const module = await import('@/utils/error-tracking')

    expect(typeof module.trackError).toBe('function')
    expect(typeof module.trackAndLogError).toBe('function')
    expect(typeof module.createErrorBoundaryHandler).toBe('function')
    expect(typeof module.withErrorTracking).toBe('function')
    expect(typeof module.getQueuedErrors).toBe('function')
    expect(typeof module.clearErrorQueue).toBe('function')
  })

  it('should track errors without throwing', async () => {
    const { trackError, getQueuedErrors, clearErrorQueue } = await import('@/utils/error-tracking')

    clearErrorQueue()
    
    const error = new Error('Test error')
    trackError(error, { component: 'TestComponent' })

    const queue = getQueuedErrors()
    expect(queue.length).toBe(1)
    expect(queue[0]!.message).toBe('Test error')
    expect(queue[0]!.context.component).toBe('TestComponent')

    clearErrorQueue()
  })

  it('should create error boundary handler', async () => {
    const { createErrorBoundaryHandler, getQueuedErrors, clearErrorQueue } = await import('@/utils/error-tracking')

    clearErrorQueue()

    const handler = createErrorBoundaryHandler('TestRoute')
    const error = new Error('Boundary error')
    const errorInfo = { componentStack: '<TestRoute>' }

    handler(error, errorInfo)

    const queue = getQueuedErrors()
    expect(queue.length).toBe(1)
    expect(queue[0]!.context.component).toBe('TestRoute')

    clearErrorQueue()
  })

  it('should wrap async functions with tracking', async () => {
    const { withErrorTracking, getQueuedErrors, clearErrorQueue } = await import('@/utils/error-tracking')

    clearErrorQueue()

    const failingFn = async () => {
      throw new Error('Async error')
    }

    const wrappedFn = withErrorTracking(failingFn, { component: 'AsyncTest' })

    await expect(wrappedFn()).rejects.toThrow('Async error')

    const queue = getQueuedErrors()
    expect(queue.length).toBe(1)

    clearErrorQueue()
  })
})
