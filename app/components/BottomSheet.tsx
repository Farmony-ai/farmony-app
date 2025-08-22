import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, PanResponder } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';

const { height: screenHeight } = Dimensions.get('window');

export interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  snapTo?: string; // percentage string like "50%"
}

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(({ isOpen, onClose, children, snapTo = "50%" }, ref) => {
  const [modalVisible, setModalVisible] = useState(isOpen);
  const animatedValue = useRef(new Animated.Value(screenHeight)).current;
  const snapPoint = screenHeight * (parseInt(snapTo) / 100);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          animatedValue.setValue(snapPoint + gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          openSheet();
        }
      },
    })
  ).current;

  const openSheet = () => {
    setModalVisible(true);
    Animated.spring(animatedValue, {
      toValue: snapPoint,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(animatedValue, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose?.();
    });
  };

  useImperativeHandle(ref, () => ({
    open: openSheet,
    close: closeSheet,
  }));

  useEffect(() => {
    if (isOpen) {
      openSheet();
    } else {
      closeSheet();
    }
  }, [isOpen]);

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal transparent visible={modalVisible} onRequestClose={closeSheet}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeSheet} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: animatedValue }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopLeftRadius: BORDER_RADIUS.XL,
    borderTopRightRadius: BORDER_RADIUS.XL,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
    ...SHADOWS.LG,
    height: '100%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.BORDER.PRIMARY,
    alignSelf: 'center',
    marginBottom: SPACING.MD,
  },
});

export default BottomSheet;
