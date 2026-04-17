import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TIMING_ENTER, TIMING_EXIT, DURATION, getStaggerDelay } from '@/theme/animations';
import { Ingredient } from '@/stores/ingredientStore';

const SOURCE_ICONS: Record<Ingredient['source'], keyof typeof Ionicons.glyphMap> = {
  barcode: 'barcode-outline',
  receipt: 'receipt-outline',
  photo: 'camera-outline',
  manual: 'pencil-outline',
};

interface Props {
  ingredient: Ingredient;
  index: number;
  onRemove: (id: string) => void;
}

export default function IngredientRow({ ingredient, index, onRemove }: Props) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    translateY.value = withDelay(delay, withTiming(0, TIMING_ENTER));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const handleRemove = () => {
    opacity.value = withTiming(0, TIMING_EXIT);
    translateX.value = withTiming(24, TIMING_EXIT);
    setTimeout(() => onRemove(ingredient.id), DURATION.exit);
  };

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={SOURCE_ICONS[ingredient.source]}
          size={15}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {ingredient.name}
        </Text>
        {!!ingredient.category && ingredient.category !== 'other' && (
          <Text style={styles.category}>{ingredient.category}</Text>
        )}
      </View>
      <Pressable
        onPress={handleRemove}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={20} color={colors.textDisabled} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  category: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  removeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
