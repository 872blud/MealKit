import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import { lookupBarcode } from '@/services/barcode';
import { useIngredientStore, Ingredient } from '@/stores/ingredientStore';

type ScannedItem = Ingredient & { pending?: boolean };

// ─── ScannedItemRow — defined OUTSIDE screen so it isn't recreated on re-render ──

function ScannedItemRow({ item }: { item: ScannedItem; index: number }) {
  const mounted = useRef(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  React.useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    opacity.value = withTiming(1, { duration: TIMING_ENTER.duration, easing: TIMING_ENTER.easing });
    translateY.value = withTiming(0, { duration: TIMING_ENTER.duration, easing: TIMING_ENTER.easing });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (item.pending) {
    return (
      <Animated.View style={[styles.itemRow, style]}>
        <SkeletonLoader height={20} width="60%" borderRadius={4} />
        <SkeletonLoader height={16} width="25%" borderRadius={4} style={{ marginTop: 4 }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.itemRow, style]}>
      <Text style={styles.itemName}>{item.name}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryLabel}>{item.category}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function BarcodeScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualText, setManualText] = useState('');
  const scannedBarcodes = useRef<Set<string>>(new Set());
  const processingBarcodes = useRef<Set<string>>(new Set());
  const insets = useSafeAreaInsets();
  const addIngredient = useIngredientStore((s) => s.addIngredient);

  const onBarcodeScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (scannedBarcodes.current.has(data)) return;
    if (processingBarcodes.current.has(data)) return;

    processingBarcodes.current.add(data);
    scannedBarcodes.current.add(data);

    // Immediate haptic feedback on scan detection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    // Add pending skeleton row
    const pendingId = `pending-${data}`;
    setScannedItems((prev) => [
      { id: pendingId, name: '', category: '', source: 'barcode', pending: true },
      ...prev,
    ]);

    const result = await lookupBarcode(data);

    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScannedItems((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                id: pendingId,
                name: result.name,
                category: result.category,
                source: 'barcode' as const,
                nutrition: result.nutrition,
                pending: false,
              }
            : item
        )
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Remove the pending row on failure
      setScannedItems((prev) => prev.filter((item) => item.id !== pendingId));
      scannedBarcodes.current.delete(data); // allow retry
    }

    processingBarcodes.current.delete(data);
  }, []);

  const onManualAdd = useCallback(() => {
    const name = manualText.trim();
    if (!name) return;
    setScannedItems((prev) => [
      { id: Date.now().toString(), name, category: 'manual', source: 'manual', pending: false },
      ...prev,
    ]);
    setManualText('');
  }, [manualText]);

  const onDone = useCallback(() => {
    scannedItems
      .filter((item) => !item.pending && item.name)
      .forEach((item) => addIngredient(item));
    router.push('/ingredients');
  }, [scannedItems, addIngredient]);

  // Permission states
  if (!permission) return <View style={styles.permissionContainer} />;
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <Text style={styles.permissionText}>Camera access is needed to scan barcodes.</Text>
        <PressableScale onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </PressableScale>
      </View>
    );
  }

  const confirmedCount = scannedItems.filter((i) => !i.pending && i.name).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Camera fills screen */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'upc_a', 'ean8', 'upc_e'] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* Scan frame overlay - centered */}
      <View style={styles.scanFrameContainer}>
        <View style={styles.scanFrame} />
      </View>

      {/* Header - top safe area */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </PressableScale>
        <PressableScale onPress={onDone} style={styles.headerBtn}>
          <Text style={styles.doneText}>
            Done{confirmedCount > 0 ? ` (${confirmedCount})` : ''}
          </Text>
        </PressableScale>
      </View>

      {/* Bottom panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomPanelWrapper}
      >
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* List */}
          <View style={styles.list}>
            {scannedItems.length === 0 ? (
              <Text style={styles.emptyHint}>Point camera at a barcode</Text>
            ) : (
              scannedItems.map((item, index) => (
                <ScannedItemRow key={item.id} item={item} index={index} />
              ))
            )}
          </View>
          {/* Manual input */}
          <TextInput
            style={styles.manualInput}
            placeholder="Add item manually..."
            placeholderTextColor={colors.textDisabled}
            value={manualText}
            onChangeText={setManualText}
            onSubmitEditing={onManualAdd}
            returnKeyType="done"
            autoCorrect={false}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  doneText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  scanFrameContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  bottomPanelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 280,
    maxHeight: 380,
  },
  list: {
    flex: 1,
    marginBottom: spacing.md,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  itemRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none',
  },
  manualInput: {
    ...typography.body,
    color: colors.text,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accentDim,
    borderRadius: 12,
  },
  permissionBtnText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
});
