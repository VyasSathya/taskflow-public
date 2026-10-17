/**
 * Share Handler Screen
 * Receives shared content from other apps and creates tasks
 * 
 * Accessed via: Share Sheet -> VibeTasks
 * Flow: Parse shared content -> Show preview -> Confirm -> Create task
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShareIntent } from 'expo-share-intent';
import { useTheme } from '@/lib/hooks';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import { useAuthStore } from '@/lib/stores';
import type { TaskStatus } from '@vibetasks/shared';

interface ParsedContent {
  title: string;
  notes: string;
  type: 'text' | 'url' | 'image' | 'file' | 'error';
  project?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Parse shared text to extract meaningful error/task info
 */
function parseSharedText(text: string): ParsedContent {
  const lines = text.trim().split('\n');
  
  let title = 'Shared task';
  let type: ParsedContent['type'] = 'text';
  let project: string | undefined;
  let priority: ParsedContent['priority'] = 'medium';
  
  // Check if it's an error
  if (
    text.includes('Error:') ||
    text.includes('TypeError:') ||
    text.includes('ReferenceError:') ||
    text.includes('SyntaxError:') ||
    text.includes('npm ERR!') ||
    text.includes('error TS') ||
    text.includes('Failed to compile') ||
    text.includes('Build failed') ||
    text.includes('FAILED') ||
    text.includes('Exception:') ||
    text.includes('Traceback')
  ) {
    type = 'error';
    priority = 'high'; // Errors are high priority
    
    // Extract error type and message
    if (text.includes('TypeError:')) {
      const match = text.match(/TypeError:\s*(.+?)(?:\n|$)/);
      if (match) title = `TypeError: ${match[1].slice(0, 50)}`;
    } else if (text.includes('ReferenceError:')) {
      const match = text.match(/ReferenceError:\s*(.+?)(?:\n|$)/);
      if (match) title = `ReferenceError: ${match[1].slice(0, 50)}`;
    } else if (text.includes('SyntaxError:')) {
      const match = text.match(/SyntaxError:\s*(.+?)(?:\n|$)/);
      if (match) title = `SyntaxError: ${match[1].slice(0, 50)}`;
    } else if (text.includes('Error:')) {
      const match = text.match(/Error:\s*(.+?)(?:\n|$)/);
      if (match) title = `Error: ${match[1].slice(0, 50)}`;
    } else if (text.includes('error TS')) {
      const match = text.match(/error (TS\d+):\s*(.+?)(?:\n|$)/);
      if (match) title = `${match[1]}: ${match[2].slice(0, 40)}`;
    } else if (text.includes('Failed to compile')) {
      title = 'Build Error: Failed to compile';
    } else if (text.includes('npm ERR!')) {
      const match = text.match(/npm ERR!\s*(.+?)(?:\n|$)/);
      if (match) title = `npm: ${match[1].slice(0, 50)}`;
    } else if (text.includes('Exception:')) {
      const match = text.match(/(\w+Exception):\s*(.+?)(?:\n|$)/);
      if (match) title = `${match[1]}: ${match[2].slice(0, 40)}`;
    } else if (lines[0]) {
      title = `Error: ${lines[0].slice(0, 50)}`;
    }
    
    // Try to detect project from file paths
    const fileMatch = text.match(/(?:apps|packages|src|lib)\/([^\/\s]+)\//);
    if (fileMatch) {
      project = fileMatch[1];
    }
  }
  // Check if it's a URL
  else if (text.match(/^https?:\/\//)) {
    type = 'url';
    try {
      const url = new URL(text.trim());
      title = `Link: ${url.hostname}${url.pathname.slice(0, 30)}`;
    } catch {
      title = `Link: ${text.slice(0, 50)}`;
    }
  }
  // Check if text contains a URL
  else if (text.match(/https?:\/\/[^\s]+/)) {
    type = 'url';
    title = lines[0].slice(0, 60) || `Link shared`;
  }
  // Plain text
  else {
    title = lines[0].slice(0, 60) || 'Shared content';
  }

  // Format notes with the original content
  const notes = type === 'error' 
    ? `\`\`\`\n${text}\n\`\`\``
    : text;

  return {
    title: title.length > 60 ? title.slice(0, 57) + '...' : title,
    notes,
    type,
    project,
    priority,
  };
}

const PRIORITY_OPTIONS: { value: ParsedContent['priority']; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: '#9CA3AF' },
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];

export default function ShareHandlerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { createTask } = useTaskMutations();
  const { isAuthenticated } = useAuthStore();
  
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  
  const [isLoading, setIsLoading] = useState(false);
  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<ParsedContent['priority']>('medium');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Parse share intent on mount
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) {
      // No share intent, go back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
      return;
    }

    // Handle image shares
    if (shareIntent.files && shareIntent.files.length > 0) {
      const file = shareIntent.files[0];
      if (file.mimeType?.startsWith('image/')) {
        setImagePreview(file.path);
        setParsedContent({
          title: 'Screenshot shared',
          notes: `Attached: ${shareIntent.files.map(f => f.fileName || 'image').join(', ')}`,
          type: 'image',
          priority: 'medium',
        });
        setEditedTitle('Screenshot shared');
        setEditedNotes(`Attached: ${shareIntent.files.map(f => f.fileName || 'image').join(', ')}`);
        setSelectedPriority('medium');
        return;
      }
    }

    // Handle URL shares
    if (shareIntent.webUrl) {
      const title = shareIntent.meta?.title || shareIntent.webUrl.slice(0, 50);
      setParsedContent({
        title: title.length > 60 ? title.slice(0, 57) + '...' : title,
        notes: shareIntent.meta?.title 
          ? `${shareIntent.meta.title}\n\n${shareIntent.webUrl}` 
          : shareIntent.webUrl,
        type: 'url',
        priority: 'medium',
      });
      setEditedTitle(title.length > 60 ? title.slice(0, 57) + '...' : title);
      setEditedNotes(shareIntent.meta?.title 
        ? `${shareIntent.meta.title}\n\n${shareIntent.webUrl}` 
        : shareIntent.webUrl);
      setSelectedPriority('medium');
      return;
    }

    // Handle text shares
    if (shareIntent.text) {
      const parsed = parseSharedText(shareIntent.text);
      setParsedContent(parsed);
      setEditedTitle(parsed.title);
      setEditedNotes(parsed.notes);
      setSelectedPriority(parsed.priority);
      return;
    }

    // Unknown content type
    setParsedContent({
      title: 'Shared content',
      notes: '',
      type: 'text',
      priority: 'medium',
    });
    setEditedTitle('Shared content');
    setEditedNotes('');
    setSelectedPriority('medium');
  }, [hasShareIntent, shareIntent, router]);

  const handleCancel = () => {
    resetShareIntent();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleCreateTask = async () => {
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the task');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to create tasks', [
        { text: 'Cancel', onPress: handleCancel },
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      await createTask.mutateAsync({
        title: editedTitle.trim(),
        notes: editedNotes,
        priority: selectedPriority,
        status: 'todo' as TaskStatus,
        project_tag: parsedContent?.project,
        created_by: 'human',
        // TODO: Handle image attachments when attachment service is ready
      });

      resetShareIntent();
      
      Alert.alert('Success', 'Task created successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }
        }
      ]);
    } catch (err) {
      console.error('Failed to create task:', err);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (parsedContent?.type) {
      case 'error':
        return { name: 'alert-circle' as const, color: '#EF4444' };
      case 'url':
        return { name: 'link' as const, color: '#3B82F6' };
      case 'image':
        return { name: 'image' as const, color: '#8B5CF6' };
      case 'file':
        return { name: 'document' as const, color: '#F59E0B' };
      default:
        return { name: 'document-text' as const, color: colors.primary };
    }
  };

  const typeIcon = getTypeIcon();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerButton: {
      padding: 8,
    },
    headerButtonText: {
      fontSize: 16,
      color: colors.primary,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    typeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeText: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    imagePreviewContainer: {
      marginBottom: 16,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    imagePreview: {
      width: '100%',
      height: 200,
      backgroundColor: colors.surface,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    priorityContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 2,
    },
    priorityLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    projectTag: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: colors.surface,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    projectTagText: {
      marginLeft: 4,
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#8B5CF6',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
      marginLeft: 8,
    },
  });

  if (!parsedContent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>
            Processing shared content...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Task</Text>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleCreateTask}
            disabled={isLoading || !editedTitle.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[
                styles.headerButtonText,
                { fontWeight: '600' },
                !editedTitle.trim() && { opacity: 0.5 },
              ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Type Indicator */}
          <View style={styles.typeIndicator}>
            <Ionicons name={typeIcon.name} size={20} color={typeIcon.color} />
            <Text style={styles.typeText}>
              {parsedContent.type === 'error' ? 'Error detected' : `${parsedContent.type} shared`}
            </Text>
          </View>

          {/* Image Preview */}
          {imagePreview && (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: imagePreview }} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="Task title"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Priority Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.priorityButton,
                    {
                      backgroundColor: selectedPriority === option.value 
                        ? `${option.color}20` 
                        : colors.surface,
                      borderColor: selectedPriority === option.value 
                        ? option.color 
                        : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPriority(option.value)}
                >
                  <Text 
                    style={[
                      styles.priorityLabel,
                      { 
                        color: selectedPriority === option.value 
                          ? option.color 
                          : colors.textSecondary 
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Detected Project */}
          {parsedContent.project && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Detected Project</Text>
              <View style={styles.projectTag}>
                <Ionicons name="folder-outline" size={14} color={colors.primary} />
                <Text style={styles.projectTagText}>{parsedContent.project}</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || !editedTitle.trim()) && styles.submitButtonDisabled,
            ]}
            onPress={handleCreateTask}
            disabled={isLoading || !editedTitle.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Task</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
