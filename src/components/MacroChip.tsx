import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type MacroType = 'protein' | 'carb' | 'fat' | 'fiber' | 'cal';

interface MacroChipProps {
  macro: MacroType;
  value: number;
  unit?: string;
  size?: 'sm' | 'md';
}

const MACRO_CONFIG: Record<MacroType, { label: string; color: string; bg: string; defaultUnit: string }> = {
  protein: { label: 'P',   color: colors.protein,        bg: colors.proteinDim,      defaultUnit: 'g'    },
  carb:    { label: 'C',   color: colors.carb,            bg: colors.carbDim,          defaultUnit: 'g'    },
  fat:     { label: 'F',   color: colors.fat,              bg: colors.fatDim,            defaultUnit: 'g'    },
  fiber:   { label: 'Fi',  color: colors.fiber,            bg: colors.fiberDim,          defaultUnit: 'g'    },
  cal:     { label: 'Cal', color: colors.text,             bg: colors.surfaceElevated,  defaultUnit: 'kcal' },
};

export default function MacroChip({ macro, value, unit, size = 'md' }: MacroChipProps) {
  const config = MACRO_CONFIG[macro];
  const resolvedUnit = unit ?? config.defaultUnit;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: config.bg },
        isSm ? styles.pillSm : styles.pillMd,
      ]}
    >
      <Text style={[styles.label, { color: config.color }, isSm && styles.labelSm]}>
        {config.label}
      </Text>
      <Text style={[styles.value, { color: config.color }, isSm && styles.valueSm]}>
        {' '}{Math.round(value)}{resolvedUnit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    ...typography.monoSmall,
    opacity: 0.75,
  },
  labelSm: {
    fontSize: 11,
  },
  value: {
    ...typography.monoSmall,
    fontWeight: '600',
  },
  valueSm: {
    fontSize: 11,
  },
});

export { MacroChip };
