/**
 * ImageThumbnail Component
 * Displays attachment images with lazy loading and lightbox
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Maximize2, Download, Trash2 } from 'lucide-react';
import { getAttachmentUrl, deleteAttachment, isImageAttachment } from '@/lib/services/attachment-service';
import { Button } from '@/components/ui/button';
import type { Attachment } from '@/lib/types';

interface ImageThumbnailProps {
  attachment: Attachment;
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageThumbnail({ attachment, onDelete, size = 'md' }: ImageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
  };

  useEffect(() => {
    if (isImageAttachment(attachment)) {
      getAttachmentUrl(attachment.storage_path).then((url) => {
        setImageUrl(url);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [attachment]);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const success = await deleteAttachment(attachment.id, attachment.storage_path);
    if (success) {
      onDelete?.();
    }
    setIsDeleting(false);
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = attachment.file_name;
      a.click();
    }
  };

  if (!isImageAttachment(attachment)) {
    // Non-image attachment - show file icon
    return (
      <div className={`${sizeClasses[size]} rounded border border-border bg-muted flex items-center justify-center text-muted-foreground`}>
        <span className="text-xs text-center px-1 truncate">{attachment.file_name.split('.').pop()?.toUpperCase()}</span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group ${sizeClasses[size]} rounded overflow-hidden border border-border bg-muted`}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:text-white hover:bg-white/20"
                onClick={() => setShowLightbox(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:text-red-400 hover:bg-white/20"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={() => setShowLightbox(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="absolute bottom-2 left-2 text-white/70 text-sm bg-black/50 px-2 py-1 rounded">
              {attachment.file_name}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

interface ImageGalleryProps {
  attachments: Attachment[];
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageGallery({ attachments, onDelete, size = 'md' }: ImageGalleryProps) {
  const imageAttachments = attachments.filter(isImageAttachment);

  if (imageAttachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {imageAttachments.map((attachment) => (
        <ImageThumbnail
          key={attachment.id}
          attachment={attachment}
          onDelete={onDelete}
          size={size}
        />
      ))}
    </div>
  );
}
