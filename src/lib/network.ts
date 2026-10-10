import { getNetworkStateAsync } from 'expo-network'

/**
 * Thrown when an action needs connectivity but the device is offline.
 * The message is user-facing, so callers can surface it directly.
 */
export class OfflineError extends Error {
  constructor(
    message = 'No internet connection. Check your network and try again.',
  ) {
    super(message)
    this.name = 'OfflineError'
  }
}

/**
 * Best-effort connectivity probe. Fails open (returns `true`) so a flaky
 * network-module read never blocks a request the OS could still deliver.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const { isConnected, isInternetReachable } = await getNetworkStateAsync()
    if (isConnected === false || isInternetReachable === false) return false
    return true
  } catch {
    return true
  }
}

/** Throws {@link OfflineError} when the device has no usable connection. */
export async function requireOnline(): Promise<void> {
  if (!(await isOnline())) throw new OfflineError()
}
