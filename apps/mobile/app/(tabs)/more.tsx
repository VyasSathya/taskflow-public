/**
 * More Screen
 * Quick access to Completed, Settings, and Profile
 */

import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useAuth } from '@/lib/hooks';
import { SafeAreaWrapper } from '@/components/common';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'completed',
      title: 'Completed Tasks',
      subtitle: 'View your finished tasks',
      icon: 'checkmark-circle-outline',
      onPress: () => router.push('/(tabs)/completed'),
      color: colors.success,
    },
    {
      id: 'archived',
      title: 'Archived Tasks',
      subtitle: 'View hidden completed tasks',
      icon: 'archive-outline',
      onPress: () => router.push('/(tabs)/archived'),
      color: colors.warning,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and account',
      icon: 'settings-outline',
      onPress: () => router.push('/(tabs)/settings'),
    },
    {
      id: 'signout',
      title: 'Sign Out',
      subtitle: 'Log out of your account',
      icon: 'log-out-outline',
      onPress: handleSignOut,
      color: colors.error,
    },
  ];

  return (
    <SafeAreaWrapper edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>
        {user && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
        )}
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.color ? `${item.color}20` : `${colors.primary}20` },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.color || colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            TaskFlow v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.lg,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  menuContainer: {
    gap: tokens.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  footer: {
    marginTop: tokens.spacing.xl,
    alignItems: 'center',
  },
  version: {
    fontSize: 13,
  },
});
