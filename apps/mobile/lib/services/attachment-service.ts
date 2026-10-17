/**
 * Attachment Service
 * Handles file uploads to Supabase Storage and attachment records
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { Attachment } from '@/lib/stores/task-store';

/**
 * Pick a document from the device
 */
export async function pickDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error picking document:', error);
    throw new Error('Failed to pick document');
  }
}

/**
 * Upload file to Supabase Storage and create attachment record
 */
export async function uploadAttachment(
  taskId: string,
  userId: string,
  file: DocumentPicker.DocumentPickerAsset
): Promise<Attachment> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const blob = base64ToBlob(base64, file.mimeType || 'application/octet-stream');

    // Generate storage path: {userId}/{taskId}/{filename}
    const filename = file.name;
    const storagePath = `${userId}/${taskId}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(storagePath, blob, {
        contentType: file.mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create attachment record in database
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        user_id: userId,
        file_name: filename,
        file_size: file.size || 0,
        file_type: file.mimeType || 'application/octet-stream',
        storage_path: storagePath,
      })
      .select()
      .single();

    if (attachmentError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('task-attachments').remove([storagePath]);
      throw new Error(`Database error: ${attachmentError.message}`);
    }

    return attachmentData;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
}

/**
 * Delete attachment from storage and database
 */
export async function deleteAttachment(attachmentId: string, storagePath: string) {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('task-attachments')
      .remove([storagePath]);

    if (storageError) {
      console.warn('Storage deletion warning:', storageError.message);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
}

/**
 * Get public URL for attachment
 */
export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage.from('task-attachments').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Download attachment
 */
export async function downloadAttachment(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from('task-attachments').download(storagePath);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Helper: Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
