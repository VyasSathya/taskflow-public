import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { pickDocument, uploadAttachment, deleteAttachment, formatFileSize } from '@/lib/services/attachment-service';
import { useAuth } from '@/lib/hooks';
import type { Attachment } from '@/lib/stores/task-store';

interface AttachmentPickerProps {
  taskId: string;
  attachments: Attachment[];
  onAttachmentAdded?: (attachment: Attachment) => void;
  onAttachmentRemoved?: (attachmentId: string) => void;
}

export function AttachmentPicker({
  taskId,
  attachments,
  onAttachmentAdded,
  onAttachmentRemoved,
}: AttachmentPickerProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handlePickDocument = async () => {
    try {
      haptics.light();
      const file = await pickDocument();

      if (!file || !user) return;

      setUploading(true);
      haptics.medium();

      const attachment = await uploadAttachment(taskId, user.id, file);

      haptics.success();
      onAttachmentAdded?.(attachment);
    } catch (error) {
      haptics.trigger('error');
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = (attachment: Attachment) => {
    Alert.alert('Delete Attachment', `Remove "${attachment.file_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            haptics.heavy();
            await deleteAttachment(attachment.id, attachment.storage_path);
            onAttachmentRemoved?.(attachment.id);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete attachment');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Attachment list */}
      {attachments.length > 0 && (
        <View style={styles.attachmentsList}>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[styles.attachmentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="document-outline" size={20} color={colors.primary} />
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                  {attachment.file_name}
                </Text>
                <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
                  {formatFileSize(attachment.file_size)}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeleteAttachment(attachment)}
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Add attachment button */}
      <Pressable
        onPress={handlePickDocument}
        disabled={uploading}
        style={[
          styles.addButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          uploading && styles.addButtonDisabled,
        ]}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Uploading...</Text>
          </>
        ) : (
          <>
            <Ionicons name="attach-outline" size={20} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Attachment</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
  },
  attachmentsList: {
    gap: tokens.spacing.xs,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
  },
  attachmentInfo: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 12,
  },
  deleteButton: {
    padding: tokens.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
