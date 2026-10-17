/**
 * Share Intent Hook
 * Handles receiving shared content from other apps (iOS Share Sheet / Android Intent)
 */

import { useEffect, useCallback, useState } from 'react';
import { useShareIntent as useExpoShareIntent, ShareIntent } from 'expo-share-intent';
import { useRouter } from 'expo-router';

export interface ParsedShareContent {
  title: string;
  notes: string;
  type: 'text' | 'url' | 'image' | 'file' | 'error';
  project?: string;
  originalContent: string;
  files?: ShareIntent['files'];
}

/**
 * Parse shared text to extract meaningful error/task info
 */
function parseSharedText(text: string): ParsedShareContent {
  const lines = text.trim().split('\n');
  
  let title = 'Shared task';
  let type: ParsedShareContent['type'] = 'text';
  let project: string | undefined;
  
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
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      title = lines[0].slice(0, 60) || `Link shared`;
    }
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
    originalContent: text,
  };
}

/**
 * Parse shared URL
 */
function parseSharedUrl(url: string, meta?: ShareIntent['meta']): ParsedShareContent {
  let title = 'Shared link';
  
  try {
    const urlObj = new URL(url);
    title = meta?.title || `${urlObj.hostname}${urlObj.pathname.slice(0, 30)}`;
  } catch {
    title = meta?.title || url.slice(0, 50);
  }

  const notes = meta?.title 
    ? `${meta.title}\n\n${url}` 
    : url;

  return {
    title: title.length > 60 ? title.slice(0, 57) + '...' : title,
    notes,
    type: 'url',
    originalContent: url,
  };
}

/**
 * Parse shared files (images, screenshots, etc.)
 */
function parseSharedFiles(files: ShareIntent['files']): ParsedShareContent {
  if (!files || files.length === 0) {
    return {
      title: 'Shared file',
      notes: '',
      type: 'file',
      originalContent: '',
    };
  }

  const file = files[0];
  const isImage = file.mimeType?.startsWith('image/');
  
  let title = 'Shared file';
  if (isImage) {
    title = files.length > 1 
      ? `Screenshot (${files.length} images)` 
      : 'Screenshot shared';
  } else {
    title = file.fileName || 'File shared';
  }

  return {
    title: title.slice(0, 60),
    notes: `Attached: ${files.map(f => f.fileName || 'file').join(', ')}`,
    type: isImage ? 'image' : 'file',
    originalContent: JSON.stringify(files),
    files,
  };
}

export interface UseShareIntentOptions {
  /**
   * Disable share intent (useful for Expo Go development)
   */
  disabled?: boolean;
  /**
   * Auto-navigate to share handler screen when content is received
   */
  autoNavigate?: boolean;
}

export function useShareIntentHandler(options: UseShareIntentOptions = {}) {
  const { disabled = false, autoNavigate = true } = options;
  const router = useRouter();
  const [parsedContent, setParsedContent] = useState<ParsedShareContent | null>(null);
  
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useExpoShareIntent({
    disabled,
  });

  // Parse share intent when received
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) {
      setParsedContent(null);
      return;
    }

    let parsed: ParsedShareContent;

    // Handle files first (images, etc.)
    if (shareIntent.files && shareIntent.files.length > 0) {
      parsed = parseSharedFiles(shareIntent.files);
    }
    // Handle web URL
    else if (shareIntent.webUrl) {
      parsed = parseSharedUrl(shareIntent.webUrl, shareIntent.meta);
    }
    // Handle raw text
    else if (shareIntent.text) {
      parsed = parseSharedText(shareIntent.text);
    }
    // Unknown content
    else {
      parsed = {
        title: 'Shared content',
        notes: '',
        type: 'text',
        originalContent: '',
      };
    }

    setParsedContent(parsed);

    // Navigate to share handler screen
    if (autoNavigate) {
      router.push('/share-handler');
    }
  }, [hasShareIntent, shareIntent, autoNavigate, router]);

  const clearShareIntent = useCallback(() => {
    resetShareIntent();
    setParsedContent(null);
  }, [resetShareIntent]);

  return {
    hasShareIntent,
    shareIntent,
    parsedContent,
    error,
    clearShareIntent,
  };
}

/**
 * Simple hook for checking if there's a share intent
 * Use in components that just need to know if share content exists
 */
export function useHasShareIntent(options: { disabled?: boolean } = {}) {
  const { hasShareIntent, error } = useExpoShareIntent({
    disabled: options.disabled,
  });

  return { hasShareIntent, error };
}
