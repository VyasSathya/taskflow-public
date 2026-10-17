/**
 * Attachment Service
 * Handles file uploads to Supabase Storage
 */

import { createClient } from '@/lib/supabase/client';
import type { Attachment } from '@/lib/types';

const BUCKET_NAME = 'task-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

/**
 * Upload a file to Supabase Storage and create attachment record
 */
export async function uploadAttachment(
  taskId: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large (max 10MB)' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${user.id}/${taskId}/${timestamp}_${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // Create attachment record
  const { data: attachment, error: dbError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    console.error('DB error:', dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    return { success: false, error: dbError.message };
  }

  return { success: true, attachment };
}

/**
 * Get a signed URL for viewing/downloading an attachment
 */
export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(attachmentId: string, storagePath: string): Promise<boolean> {
  const supabase = createClient();

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete record
  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    console.error('DB delete error:', dbError);
    return false;
  }

  return true;
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if attachment is an image based on file type
 */
export function isImageAttachment(attachment: Attachment): boolean {
  return ALLOWED_IMAGE_TYPES.includes(attachment.file_type);
}
