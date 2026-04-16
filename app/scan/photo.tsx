import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIMING_ENTER, TIMING_EXIT, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import { identifyCounterIngredients, ExtractedIngredient } from '@/services/openai';
import { useIngredientStore } from '@/stores/ingredientStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type ScreenState = 'camera' | 'processing' | 'review' | 'error';

interface IngredientItem extends ExtractedIngredient {
  id: string;
  source: 'photo' | 'manual';
}

// ─── RemovableRow ─────────────────────────────────────────────────────────────

interface RemovableRowProps {
  item: IngredientItem;
  onRemove: (id: string) => void;
  index: number;
}

function RemovableRow({ item, onRemove, index }: RemovableRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    translateY.value = withDelay(delay, withTiming(0, TIMING_ENTER));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleRemove = useCallback(() => {
    opacity.value = withTiming(0, TIMING_EXIT);
    translateY.value = withTiming(-8, TIMING_EXIT);
    setTimeout(() => onRemove(item.id), TIMING_EXIT.duration);
  }, [item.id, onRemove, opacity, translateY]);

  return (
    <Animated.View style={[styles.row, animStyle]}>
      <Text style={styles.rowName}>{item.name}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <PressableScale onPress={handleRemove} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={colors.textDisabled} />
      </PressableScale>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PhotoScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [screenState, setScreenState] = useState<ScreenState>('camera');
  const [items, setItems] = useState<IngredientItem[]>([]);
  const [quickAdd, setQuickAdd] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const addIngredient = useIngredientStore((s) => s.addIngredient);

  // Permission loading
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to photograph your counter ingredients.
        </Text>
        <PressableScale onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </PressableScale>
      </View>
    );
  }

  const onCapture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.8 });
    if (!photo?.base64) return;
    setScreenState('processing');
    const extracted = await identifyCounterIngredients(photo.base64);
    if (extracted.length === 0) {
      setScreenState('error');
    } else {
      setItems(
        extracted.map((e, i) => ({
          ...e,
          id: `photo-${i}-${Date.now()}`,
          source: 'photo' as const,
        }))
      );
      setScreenState('review');
    }
  };

  const onRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onQuickAdd = useCallback(() => {
    const name = quickAdd.trim();
    if (!name) return;
    setItems((prev) => [
      { id: `manual-${Date.now()}`, name, category: 'other', source: 'manual' as const },
      ...prev,
    ]);
    setQuickAdd('');
  }, [quickAdd]);

  const onAddToList = useCallback(() => {
    items.forEach((item) =>
      addIngredient({ name: item.name, category: item.category, source: item.source })
    );
    router.push('/ingredients');
  }, [items, addIngredient]);

  // ── Processing ─────────────────────────────────────────────────────────────
  if (screenState === 'processing') {
    return (
      <View style={[styles.processingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.processingLabel}>Identifying ingredients...</Text>
        <View style={{ width: '100%', gap: spacing.md }}>
          <SkeletonLoader height={20} width="75%" borderRadius={6} />
          <SkeletonLoader height={20} width="55%" borderRadius={6} />
          <SkeletonLoader height={20} width="85%" borderRadius={6} />
          <SkeletonLoader height={20} width="65%" borderRadius={6} />
          <SkeletonLoader height={20} width="70%" borderRadius={6} />
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (screenState === 'error') {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Ionicons name="image-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.errorTitle}>Couldn't identify ingredients</Text>
        <Text style={styles.errorBody}>
          Spread items on a flat, well-lit surface and make sure they're clearly visible.
        </Text>
        <PressableScale
          onPress={() => setScreenState('camera')}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </PressableScale>
      </View>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (screenState === 'review') {
    return (
      <View style={[styles.reviewContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.sm }]}>
          <PressableScale onPress={() => setScreenState('camera')}>
            <Text style={styles.headerBack}>← Retake</Text>
          </PressableScale>
          <PressableScale onPress={onAddToList} disabled={items.length === 0}>
            <Text style={[styles.headerDone, items.length === 0 && { opacity: 0.4 }]}>
              Done ({items.length})
            </Text>
          </PressableScale>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.md }}
        >
          {/* Section label */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            Found {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'}
          </Text>

          {/* Removable list */}
          {items.map((item, index) => (
            <RemovableRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              index={index}
            />
          ))}

          {/* Quick-add section */}
          <View style={styles.quickAddSection}>
            <Text style={styles.quickAddLabel}>Did we miss anything?</Text>
            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAdd}
                onChangeText={setQuickAdd}
                placeholder="Add an ingredient..."
                placeholderTextColor={colors.textDisabled}
                returnKeyType="done"
                onSubmitEditing={onQuickAdd}
              />
              <PressableScale onPress={onQuickAdd}>
                <Ionicons name="add-circle" size={28} color={colors.accent} />
              </PressableScale>
            </View>
          </View>
        </ScrollView>

        {/* Add to list CTA */}
        <PressableScale
          onPress={onAddToList}
          style={[styles.addBtn, items.length === 0 && { opacity: 0.4 }]}
          disabled={items.length === 0}
        >
          <Text style={styles.addBtnText}>
            Add {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'} to list
          </Text>
        </PressableScale>
      </View>
    );
  }

  // ── Camera (default) ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        mode="picture"
      />

      {/* Header overlay */}
      <View style={[styles.cameraHeader, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Back</Text>
        </PressableScale>
      </View>

      {/* Hint text */}
      <View style={styles.hintWrapper}>
        <Text style={styles.hint}>Spread items on a flat surface then capture</Text>
      </View>

      {/* Capture button */}
      <View style={[styles.captureWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PressableScale onPress={onCapture} style={styles.captureBtn} scaleTo={0.95}>
          <Ionicons name="camera" size={32} color="#FFFFFF" />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  camera: { ...StyleSheet.absoluteFillObject },

  // Camera header (absolute overlay)
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Hint text
  hintWrapper: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Capture button
  captureWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared header (review state)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerBack: { ...typography.bodyMedium, color: colors.textSecondary },
  headerDone: { ...typography.bodyMedium, color: colors.accent, fontVariant: ['tabular-nums'] },

  // Processing state
  processingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  processingLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // Review state
  reviewContainer: { flex: 1, backgroundColor: colors.background },
  sectionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Ingredient row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowName: { ...typography.bodyMedium, color: colors.text, flex: 1, marginRight: spacing.sm },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  categoryText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none' as const,
  },
  removeBtn: { padding: spacing.xs },

  // Quick-add section
  quickAddSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  quickAddLabel: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  quickAddRow: { flexDirection: 'row', alignItems: 'center' },
  quickAddInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },

  // Add to list CTA
  addBtn: {
    margin: spacing.lg,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { ...typography.bodyMedium, color: '#FFFFFF', fontVariant: ['tabular-nums'] },

  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryText: { ...typography.bodyMedium, color: colors.accent },

  // Permission state
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  permissionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accentDim,
    borderRadius: 12,
  },
  permissionBtnText: { ...typography.bodyMedium, color: colors.accent },
});
