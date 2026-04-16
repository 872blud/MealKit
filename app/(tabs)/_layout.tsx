import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import PressableScale from '@/components/PressableScale';

// Tab config
const TABS = [
  {
    name: 'scan',
    label: 'Scan',
    activeIcon: 'scan' as const,
    inactiveIcon: 'scan-outline' as const,
  },
  {
    name: 'nutrition',
    label: 'Nutrition',
    activeIcon: 'nutrition' as const,
    inactiveIcon: 'nutrition-outline' as const,
  },
] as const;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS.find(t => t.name === route.name);
        if (!tab) return null;

        const isFocused = state.index === index;
        const color = isFocused ? colors.accent : colors.textDisabled;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={isFocused ? tab.activeIcon : tab.inactiveIcon}
              size={26}
              color={color}
            />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  tabLabel: {
    ...typography.caption,
    // Override uppercase from label preset — tabs use sentence case
    textTransform: 'none',
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    />
  );
}
