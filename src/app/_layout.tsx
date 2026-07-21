// import { useEffect } from 'react'
// import { Stack } from 'expo-router'
// import { StatusBar } from 'expo-status-bar'
// import { StyleSheet, useColorScheme } from 'react-native'
// import { GestureHandlerRootView } from 'react-native-gesture-handler'
// import { PaperProvider } from 'react-native-paper'

// import { QueryProvider } from '@/providers/query-provider'
// import { AuthProvider } from '@/providers/auth-provider'
// import { paperTheme } from '@/constants/theme'
// import { getDb } from '@/db'
// import { useSyncPendingNotes } from '@/hooks/use-sync'

// import "../global.css"

// function DbInitializer({ children }: { children: React.ReactNode }) {
//   useEffect(() => {
//     getDb().catch(console.warn)
//   }, [])

//   useSyncPendingNotes()

//   return <>{children}</>
// }

// export default function RootLayout() {
//   const scheme = useColorScheme()

//   return (
//     <GestureHandlerRootView style={styles.root}>
//       <PaperProvider theme={paperTheme(scheme === 'dark' ? 'dark' : 'light')}>
//         <QueryProvider>
//           <AuthProvider>
//             <DbInitializer>
//               <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
//               <Stack screenOptions={{ headerShown: false }}>
//                 <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
//                 <Stack.Screen name="search" />
//                 <Stack.Screen
//                   name="auth/login"
//                   options={{ presentation: 'modal' }}
//                 />
//                 <Stack.Screen
//                   name="auth/signup"
//                   options={{ presentation: 'modal' }}
//                 />
//                 <Stack.Screen
//                   name="note/create"
//                   options={{ presentation: 'modal' }}
//                 />
//                 <Stack.Screen name="note/[id]" />
//                 <Stack.Screen
//                   name="profile/index"
//                   options={{ presentation: 'modal' }}
//                 />
//                 <Stack.Screen
//                   name="labels/index"
//                   options={{ presentation: 'modal' }}
//                 />
//               </Stack>
//             </DbInitializer>
//           </AuthProvider>
//         </QueryProvider>
//       </PaperProvider>
//     </GestureHandlerRootView>
//   )
// }

// const styles = StyleSheet.create({
//   root: { flex: 1 },
// })

import { useState } from 'react';
import { Alert, Button, Image, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ImagePickerExample() {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library.
    // Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
    // and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
    // so the app users aren't surprised by a system dialog after picking a video.
    // See "Invoke permissions for videos" sub section for more details.
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access the media library is required.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
});
