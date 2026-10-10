import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OfflineError, isOnline, requireOnline } from './network'

const { getNetworkStateAsync } = vi.hoisted(() => ({
  getNetworkStateAsync: vi.fn(),
}))

vi.mock('expo-network', () => ({ getNetworkStateAsync }))

describe('isOnline', () => {
  beforeEach(() => getNetworkStateAsync.mockReset())

  it('is true when connected and the internet is reachable', async () => {
    getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    })
    await expect(isOnline()).resolves.toBe(true)
  })

  it('is false when there is no connection', async () => {
    getNetworkStateAsync.mockResolvedValue({ isConnected: false })
    await expect(isOnline()).resolves.toBe(false)
  })

  it('is false when the network has no internet access', async () => {
    getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: false,
    })
    await expect(isOnline()).resolves.toBe(false)
  })

  it('fails open when the probe throws', async () => {
    getNetworkStateAsync.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    await expect(isOnline()).resolves.toBe(true)
  })
})

describe('requireOnline', () => {
  beforeEach(() => getNetworkStateAsync.mockReset())

  it('throws OfflineError when offline', async () => {
    getNetworkStateAsync.mockResolvedValue({ isConnected: false })
    await expect(requireOnline()).rejects.toBeInstanceOf(OfflineError)
  })

  it('resolves when online', async () => {
    getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    })
    await expect(requireOnline()).resolves.toBeUndefined()
  })
})
