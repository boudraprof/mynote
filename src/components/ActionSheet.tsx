import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@/hooks/use-theme'
import { Radius, Shadow, Spacing } from '@/constants/theme'

interface ActionSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  containerStyle?: ViewStyle
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export function ActionSheet({
  visible,
  onClose,
  children,
  containerStyle,
}: ActionSheetProps) {
  const theme = useTheme()
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (visible) {
      setShowModal(true)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start()
    } else if (showModal) {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false)
      })
    }
  }, [visible, translateY, showModal])

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false)
      onClose()
    })
  }, [onClose, translateY])

  if (!showModal) return null

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            transform: [{ translateY }],
          },
          containerStyle,
        ]}
      >
        <Pressable onPress={() => {}}>
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.textSecondary }]} />
          </View>
        </Pressable>
        {children}
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.six,
    maxHeight: SCREEN_HEIGHT * 0.7,
    ...Shadow.lg,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
})
