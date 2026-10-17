/**
 * Tab Layout - Matches Web App Structure
 *
 * 4 Main Tabs (matching web sidebar):
 * - Focus: Kanban board (Todo, Vibing, Done columns)
 * - Inbox: Unified view of errors + feedback with source filtering
 * - Priority: Tasks sorted by priority
 * - Settings: App configuration
 *
 * Hidden tabs accessible programmatically:
 * - Completed, Errors, Today, Upcoming, Calendar, More, Archived
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useHaptics } from '@/lib/hooks';
import { useTaskInit } from '@/lib/hooks/useTasks';
import { tokens, iconSizes } from '@/lib/theme';
import { ShareIntentHandler } from '@/components/share/ShareIntentHandler';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: TabIconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  // Initialize task-related operations (seed tags, auto-archive)
  useTaskInit();

  // Android gesture nav has 0 insets, so use a minimum padding
  const bottomPadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 24)
    : Math.max(insets.bottom, 8);

  // Calculate tab bar height based on safe area
  const tabBarHeight = 56 + bottomPadding;

  return (
    <>
      {/* Handle incoming share intents */}
      <ShareIntentHandler />
      
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          paddingBottom: bottomPadding,
          paddingTop: tokens.spacing.sm,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 4 : 0,
        },
      }}
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
    >
      {/* Main 4 tabs - matches web sidebar navigation */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="flash-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="mail-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="priority"
        options={{
          title: 'Priority',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Hidden tabs - accessed programmatically */}
      <Tabs.Screen
        name="completed"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="errors"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="today"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="archived"
        options={{
          href: null,
        }}
      />
      </Tabs>
    </>
  );
}
