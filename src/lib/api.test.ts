import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from './api'
import { OfflineError } from './network'

const { getCookie, signOut, getNetworkStateAsync } = vi.hoisted(() => ({
  getCookie: vi.fn(),
  signOut: vi.fn(),
  getNetworkStateAsync: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authClient: { getCookie, signOut },
}))

vi.mock('expo-network', () => ({ getNetworkStateAsync }))

const SESSION_COOKIE = 'better-auth.session_token=abc.def'

describe('api request interceptor', () => {
  beforeEach(() => {
    getCookie.mockReset()
    getCookie.mockResolvedValue(SESSION_COOKIE)
    getNetworkStateAsync.mockReset()
    getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    })
  })

  it('attaches the resolved session cookie to outgoing requests', async () => {
    let wireCookie = ''
    api.defaults.adapter = async (config) => {
      const headers = config.headers as unknown as {
        Cookie?: unknown
        get?: (name: string) => unknown
      }
      wireCookie = String(headers.Cookie ?? headers.get?.('Cookie') ?? '')
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await api.get('/notes')

    expect(wireCookie).toBe(SESSION_COOKIE)
  })

  it('sends no cookie header when there is no session', async () => {
    getCookie.mockResolvedValue('')
    let wireCookie: string | undefined
    api.defaults.adapter = async (config) => {
      const headers = config.headers as unknown as {
        Cookie?: unknown
        get?: (name: string) => unknown
      }
      wireCookie = String(headers.Cookie ?? headers.get?.('Cookie') ?? '')
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await api.get('/notes')

    expect(wireCookie).toBe('')
  })

  it('rejects with OfflineError and never hits the wire when offline', async () => {
    getNetworkStateAsync.mockResolvedValue({ isConnected: false })
    let adapterCalled = false
    api.defaults.adapter = async (config) => {
      adapterCalled = true
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await expect(api.get('/notes')).rejects.toBeInstanceOf(OfflineError)
    expect(adapterCalled).toBe(false)
  })
})
