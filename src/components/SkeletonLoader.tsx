import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonLoader({
  width = '100%',
  height,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true // reverse (ping-pong)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const staticStyle: ViewStyle = {
    width: width as ViewStyle['width'],
    height,
    borderRadius,
    backgroundColor: colors.surfaceElevated,
  };

  return (
    <Animated.View
      style={[staticStyle, animatedStyle, style]}
    />
  );
}

export { SkeletonLoader };
