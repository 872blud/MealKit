import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TIMING_BUTTON } from '@/theme/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleTo?: number; // defaults to 0.97
}

export default function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, TIMING_BUTTON);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, TIMING_BUTTON);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export { PressableScale };
