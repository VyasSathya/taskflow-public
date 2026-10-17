import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, useAuth, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { useState } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';
import { useTaskStore } from '@/lib/stores/task-store';
import { SafeAreaWrapper } from '@/components/common';
import { AISetupCard } from '@/components/onboarding/AISetupCard';
import { useTaskMutations, useArchivedTasks } from '@/lib/hooks/useTasks';
import type { ThemeName } from '@/lib/theme/themes';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeName } = useTheme();
  const { user, signOut } = useAuth();
  const haptics = useHaptics();
  const { setTheme } = useThemeStore();
  const { autoArchiveDays, setAutoArchiveDays } = useTaskStore();
  const { clearArchivedTasks, autoArchiveOldTasks } = useTaskMutations();
  const { data: archivedTasks } = useArchivedTasks();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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

  const availableThemes: ThemeName[] = ['light', 'dark', 'ocean', 'forest', 'sunset', 'midnight'];

  const handleThemeChange = () => {
    const currentIndex = availableThemes.indexOf(themeName as ThemeName);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setTheme(availableThemes[nextIndex]);
  };

  const getThemeLabel = () => {
    return themeName.charAt(0).toUpperCase() + themeName.slice(1);
  };

  const autoArchiveOptions = [
    { label: 'Never', value: 0 },
    { label: '3 days', value: 3 },
    { label: '7 days', value: 7 },
    { label: '14 days', value: 14 },
    { label: '30 days', value: 30 },
  ];

  const handleAutoArchiveChange = () => {
    const currentIndex = autoArchiveOptions.findIndex((opt) => opt.value === autoArchiveDays);
    const nextIndex = (currentIndex + 1) % autoArchiveOptions.length;
    const newValue = autoArchiveOptions[nextIndex].value;
    haptics.selection();
    setAutoArchiveDays(newValue);

    // If enabled, trigger auto-archive immediately for old tasks
    if (newValue > 0) {
      autoArchiveOldTasks.mutate(newValue);
    }
  };

  const getAutoArchiveLabel = () => {
    const option = autoArchiveOptions.find((opt) => opt.value === autoArchiveDays);
    return option ? option.label : 'Never';
  };

  const handleClearArchived = () => {
    const count = archivedTasks?.length || 0;
    if (count === 0) {
      Alert.alert('No Archived Tasks', 'There are no archived tasks to clear.');
      return;
    }

    Alert.alert(
      'Clear Archived Tasks',
      `Are you sure you want to permanently delete ${count} archived task${count > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            haptics.trigger('heavy');
            clearArchivedTasks.mutate();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaWrapper edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - consistent with other screens */}
        <View style={styles.header}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="settings" size={iconSizes.header} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Customize your experience
          </Text>
        </View>

        {/* Account Section */}
        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>

            {/* User Info Card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.userInfo}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={32} color={colors.primary} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {user.user_metadata?.full_name || 'User'}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                    {user.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>

          <TouchableOpacity
            onPress={handleThemeChange}
            style={[styles.settingRow, { backgroundColor: colors.surface }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {getThemeLabel()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>

          <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Archive Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ARCHIVE</Text>

          <TouchableOpacity
            onPress={handleAutoArchiveChange}
            style={[styles.settingRow, { backgroundColor: colors.surface }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="time-outline" size={22} color={colors.warning} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Auto-archive after</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {getAutoArchiveLabel()} {autoArchiveDays > 0 ? 'of completion' : ''}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearArchived}
            style={[styles.settingRow, { backgroundColor: colors.surface }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Clear archived tasks</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {archivedTasks?.length || 0} tasks archived
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* AI Setup Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AI SETUP</Text>
          <AISetupCard variant="card" />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>

          <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  1.0.0
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutButton, { backgroundColor: colors.error }]}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={[styles.signOutText, { color: '#FFFFFF' }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: tokens.spacing.xs,
  },
  section: {
    marginTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: tokens.spacing.md,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: tokens.borderRadius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.xl,
    marginTop: tokens.spacing.sm,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
    marginLeft: tokens.spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.xl,
    marginBottom: tokens.spacing.xs,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.xl,
    marginTop: tokens.spacing.xl * 2,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: tokens.spacing.sm,
  },
  bottomSpacer: {
    height: 120,
  },
});
