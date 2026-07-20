import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '@/hooks/use-theme'
import { Spacing } from '@/constants/theme'
import { config } from '@/lib/env'
import { uploadImage } from '@/api/upload'

interface ImageAttachmentsProps {
  image: string | null
  onChange: (url: string | null) => void
}

export function ImageAttachments({ image, onChange }: ImageAttachmentsProps) {
  const theme = useTheme()

  const handlePick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to choose images.'
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const uploadResult = await uploadImage({
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        })
        if (uploadResult.url) {
          onChange(uploadResult.url)
        } else {
          Alert.alert('Error', uploadResult.errors || 'Upload failed')
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const handleRemove = () => {
    onChange(null)
  }

  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: image.startsWith('http')
                ? image
                : `${config.apiUrl}${image}`,
            }}
            style={styles.image}
            resizeMode="cover"
          />
          <Pressable
            style={[styles.removeBtn, { backgroundColor: theme.background }]}
            onPress={handleRemove}
          >
            <Ionicons name="close-outline" size={18} color={theme.text} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: theme.backgroundElement,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={handlePick}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="add-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.addText, { color: theme.textSecondary }]}>
              Add image
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.two },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 200, borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  addText: { fontSize: 15, fontWeight: 500 },
})
