/**
 * IndexedDB-based offline queue for persisting mutations
 * Survives page refreshes and browser restarts
 */

const DB_NAME = 'offline-queue'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

interface QueuedMutation {
  id: string
  url: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: string
  headers?: Record<string, string>
  timestamp: number
  retries: number
  maxRetries: number
}

let dbInstance: IDBDatabase | null = null

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Add a mutation to the offline queue
 */
export async function addToOfflineQueue(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>
): Promise<string> {
  const db = await openDB()
  const id = `mutation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const entry: QueuedMutation = {
    ...mutation,
    id,
    timestamp: Date.now(),
    retries: 0,
    maxRetries: 3,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(entry)

    request.onsuccess = () => resolve(id)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all pending mutations from the queue
 */
export async function getPendingMutations(): Promise<Array<QueuedMutation>> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Remove a mutation from the queue by ID
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update a mutation (e.g., increment retry count)
 */
export async function updateMutation(
  id: string,
  updates: Partial<QueuedMutation>
): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const existing = getRequest.result as QueuedMutation | undefined
      if (existing) {
        const updated = { ...existing, ...updates }
        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        resolve()
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Clear all mutations from the queue
 */
export async function clearOfflineQueue(): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get the count of pending mutations
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Handle a failed mutation: drop it once it exceeds max retries, otherwise
 * bump the retry counter. Shared by `processOfflineQueue` and `offlineFetch`.
 */
async function handleFailure(mutation: QueuedMutation): Promise<boolean> {
  if (mutation.retries >= mutation.maxRetries) {
    await removeFromOfflineQueue(mutation.id)
    return false
  }
  await updateMutation(mutation.id, { retries: mutation.retries + 1 })
  return true
}

/**
 * Process the offline queue - retry all pending mutations
 */
export async function processOfflineQueue(
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const mutations = await getPendingMutations()
  let success = 0
  let failed = 0

  // Sort by timestamp to process oldest first
  const sorted = mutations.sort((a, b) => a.timestamp - b.timestamp)

  for (const mutation of sorted) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          ...mutation.headers,
        },
        body: mutation.body,
      })

      if (response.ok) {
        await removeFromOfflineQueue(mutation.id)
        success++
      } else {
        // Server error - check if retryable
        await handleFailure(mutation)
        failed++
      }
    } catch {
      // Network error - will retry later
      await handleFailure(mutation)
      failed++
    }

    onProgress?.(success + failed, mutations.length)
  }

  return { success, failed }
}

/**
 * Create a fetch wrapper that queues requests when offline
 */
export async function offlineFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // const isOnline = navigator.onLine
   const   { useOffline } = await import('next/offline') ;
  const isOnline = useOffline()
  const queueRequest = async (): Promise<never> => {
    const method = (options.method || 'GET').toUpperCase()
    if (method !== 'GET') {
      await addToOfflineQueue({
        url,
        method: method as QueuedMutation['method'],
        body: options.body as string | undefined,
        headers: options.headers as Record<string, string> | undefined,
      })
    }
    throw new Error(
      isOnline
        ? 'Network error - request queued for retry'
        : 'Offline - request queued for retry',
    )
  }

  if (isOnline) {
    try {
      return await fetch(url, options)
    } catch {
      return queueRequest()
    }
  }

  // Offline - queue non-GET requests, reject GETs
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    return queueRequest()
  }
  throw new Error('Offline - cannot make GET requests')
}
