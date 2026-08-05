import { Drawer } from 'expo-router/drawer'

import { useTheme } from '@/hooks/use-theme'
import { DrawerContent } from '@/components/DrawerContent'

export default function DrawerLayout() {
  const theme = useTheme()

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEdgeWidth: 50,
        drawerStyle: {
          backgroundColor: theme.background,
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="index" />
    </Drawer>
  )
}
