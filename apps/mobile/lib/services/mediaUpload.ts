import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

const getSupabase = () => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
};

export interface UploadResult {
  publicUrl: string;
  path: string;
  size: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type OnProgress = (progress: UploadProgress) => void;

/**
 * Media upload service for handling images and files
 * Uploads to Supabase Storage
 */
export const mediaUploadService = {
  /**
   * Pick image from camera roll
   */
  async pickImage(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePicker.ImagePickerAsset | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  },

  /**
   * Take photo with camera
   */
  async takePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePicker.ImagePickerAsset | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  },

  /**
   * Pick video from library
   */
  async pickVideo(options?: {
    maxDuration?: number;
  }): Promise<ImagePicker.ImagePickerAsset | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: options?.maxDuration ?? 60,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  },

  /**
   * Upload file to Supabase Storage
   *
   * @param uri - Local file URI
   * @param bucket - Storage bucket name
   * @param folder - Optional folder path within bucket
   * @param onProgress - Optional progress callback
   */
  async uploadToStorage(
    uri: string,
    bucket: string,
    folder?: string,
    onProgress?: OnProgress
  ): Promise<UploadResult> {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Generate unique filename
    const extension = uri.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const path = folder ? `${folder}/${filename}` : filename;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Convert to ArrayBuffer for upload
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Simulate progress (Supabase doesn't provide real progress)
    if (onProgress) {
      onProgress({ loaded: 0, total: byteArray.length, percentage: 0 });
    }

    // Upload to Supabase
    const client = getSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, byteArray, {
        contentType: this.getMimeType(extension),
        upsert: false,
      });

    if (error) {
      throw error;
    }

    if (onProgress) {
      onProgress({ loaded: byteArray.length, total: byteArray.length, percentage: 100 });
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      publicUrl: urlData.publicUrl,
      path: data.path,
      size: byteArray.length,
    };
  },

  /**
   * Upload image (convenience wrapper)
   */
  async uploadImage(
    asset: ImagePicker.ImagePickerAsset,
    bucket: string = 'images',
    folder?: string,
    onProgress?: OnProgress
  ): Promise<UploadResult> {
    return this.uploadToStorage(asset.uri, bucket, folder, onProgress);
  },

  /**
   * Upload avatar specifically
   */
  async uploadAvatar(
    asset: ImagePicker.ImagePickerAsset,
    userId: string,
    onProgress?: OnProgress
  ): Promise<UploadResult> {
    return this.uploadToStorage(
      asset.uri,
      'avatars',
      userId,
      onProgress
    );
  },

  /**
   * Delete file from storage
   */
  async deleteFromStorage(bucket: string, path: string): Promise<void> {
    const client = getSupabase();
    const { error } = await client.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }
  },

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const client = getSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  },

  /**
   * Helper: Get MIME type from extension
   */
  getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  },

  /**
   * Helper: Compress image before upload
   */
  async compressImage(
    uri: string,
    quality: number = 0.7
  ): Promise<string> {
    // For basic compression, re-pick with lower quality
    // For more control, use expo-image-manipulator
    const { ImageManipulator } = await import('expo-image-manipulator');

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // No transformations
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  },
};
