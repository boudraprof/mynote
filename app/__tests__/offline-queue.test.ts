import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock IndexedDB
const mockStore = new Map<string, unknown>()
const mockTransaction = {
  objectStore: vi.fn(() => ({
    add: vi.fn(() => ({ onsuccess: null, onerror: null, result: 'id' })),
    get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
    getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
    delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
    put: vi.fn(() => ({ onsuccess: null, onerror: null })),
    clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
    count: vi.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
  })),
}

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => mockTransaction),
    },
  })),
})

describe('offline-queue', () => {
  beforeEach(() => {
    mockStore.clear()
    vi.clearAllMocks()
  })

  it('should export expected functions', async () => {
    const module = await import('@/utils/offline-queue')

    expect(typeof module.addToOfflineQueue).toBe('function')
    expect(typeof module.getPendingMutations).toBe('function')
    expect(typeof module.removeFromOfflineQueue).toBe('function')
    expect(typeof module.updateMutation).toBe('function')
    expect(typeof module.clearOfflineQueue).toBe('function')
    expect(typeof module.getQueueCount).toBe('function')
    expect(typeof module.processOfflineQueue).toBe('function')
    expect(typeof module.offlineFetch).toBe('function')
  })

  it('should export useOnlineStatus from the hooks module', async () => {
    const { useOnlineStatus } = await import('@/hooks/useOnlineStatus')
    expect(typeof useOnlineStatus).toBe('function')
  })
})
