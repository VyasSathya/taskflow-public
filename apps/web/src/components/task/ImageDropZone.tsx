/**
 * ImageDropZone Component
 * Drag-drop zone for uploading images to tasks
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { uploadAttachment, isImageFile } from '@/lib/services/attachment-service';

interface ImageDropZoneProps {
  taskId: string;
  onUploadComplete?: () => void;
  compact?: boolean;
}

export function ImageDropZone({ taskId, onUploadComplete, compact = false }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(isImageFile);

    if (imageFiles.length === 0) {
      setError('Only images are allowed (JPEG, PNG, GIF, WebP)');
      return;
    }

    setIsUploading(true);

    try {
      for (const file of imageFiles) {
        const result = await uploadAttachment(taskId, file);
        if (!result.success) {
          setError(result.error || 'Upload failed');
          break;
        }
      }
      onUploadComplete?.();
    } catch (err) {
      setError('Upload failed');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [taskId, onUploadComplete]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(isImageFile);

    if (imageFiles.length === 0) {
      setError('Only images are allowed');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      for (const file of imageFiles) {
        const result = await uploadAttachment(taskId, file);
        if (!result.success) {
          setError(result.error || 'Upload failed');
          break;
        }
      }
      onUploadComplete?.();
    } catch (err) {
      setError('Upload failed');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [taskId, onUploadComplete]);

  if (compact) {
    return (
      <label
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
          isDragging
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ImageIcon className="h-3 w-3" />
        )}
        <span>Add Image</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>
    );
  }

  return (
    <div className="space-y-2">
      <label
        className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-border hover:border-purple-500/50 hover:bg-accent/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-purple-500 mb-2" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-purple-500">Click to upload</span> or drag and drop
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                PNG, JPG, GIF, WebP (max 10MB)
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <X className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
