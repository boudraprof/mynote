import { useNetworkState } from 'expo-network'

export function useNetwork() {
  const networkState = useNetworkState()
  return networkState.isConnected ?? true
}
