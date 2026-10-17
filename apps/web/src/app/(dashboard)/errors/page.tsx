/**
 * Error Capture Page
 * Paste any error or upload a screenshot, AI parses it into a task
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Clipboard, Camera, Zap, CheckCircle, AlertCircle, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Tesseract from 'tesseract.js';
import { PAGE_HEADER, COLORS, SPACING, LOADING } from '@/lib/styles/constants';

type OcrStatus = 'idle' | 'processing' | 'success' | 'error';

export default function ErrorCapturePage() {
  const [errorText, setErrorText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createTask } = useTaskMutations();
  const router = useRouter();

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setErrorText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const parseErrorToTask = (error: string): { title: string; notes: string; project?: string } => {
    const lines = error.trim().split('\n');
    
    // Try to extract a meaningful title
    let title = 'Error to fix';
    let project: string | undefined;
    
    // Common error patterns
    if (error.includes('TypeError:')) {
      const match = error.match(/TypeError:\s*(.+?)(?:\n|$)/);
      if (match) title = `TypeError: ${match[1].slice(0, 60)}`;
    } else if (error.includes('Error:')) {
      const match = error.match(/Error:\s*(.+?)(?:\n|$)/);
      if (match) title = `Error: ${match[1].slice(0, 60)}`;
    } else if (error.includes('error TS')) {
      const match = error.match(/error (TS\d+):\s*(.+?)(?:\n|$)/);
      if (match) title = `${match[1]}: ${match[2].slice(0, 50)}`;
    } else if (error.includes('Failed to compile')) {
      title = 'Build Error: Failed to compile';
    } else if (error.includes('npm ERR!')) {
      const match = error.match(/npm ERR!\s*(.+?)(?:\n|$)/);
      if (match) title = `npm: ${match[1].slice(0, 60)}`;
    } else if (lines[0]) {
      title = lines[0].slice(0, 80);
    }

    // Try to detect project from file paths
    const fileMatch = error.match(/(?:apps|packages)\/([^\/]+)\//);
    if (fileMatch) {
      project = fileMatch[1];
    }

    return {
      title: title.length > 80 ? title.slice(0, 77) + '...' : title,
      notes: `\`\`\`\n${error}\n\`\`\``,
      project,
    };
  };

  const processImageWithOCR = useCallback(async (imageSource: string | File) => {
    setOcrStatus('processing');
    setOcrProgress(0);
    
    try {
      const result = await Tesseract.recognize(
        imageSource,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );
      
      const extractedText = result.data.text.trim();
      
      if (extractedText) {
        setErrorText(extractedText);
        setOcrStatus('success');
      } else {
        setOcrStatus('error');
      }
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrStatus('error');
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewImage(dataUrl);
      processImageWithOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [processImageWithOCR]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearImage = () => {
    setPreviewImage(null);
    setOcrStatus('idle');
    setOcrProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!errorText.trim()) return;

    setIsProcessing(true);
    try {
      const { title, notes, project } = parseErrorToTask(errorText);
      
      await createTask.mutateAsync({
        title,
        notes,
        priority: 'high',
        status: 'todo',
        project_tag: project,
        created_by: 'human',
      });

      setStatus('success');
      setErrorText('');
      clearImage();
      
      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to create task:', err);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={PAGE_HEADER.container}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={`${PAGE_HEADER.icon} ${COLORS.semantic.error.text}`} />
            <h1 className={PAGE_HEADER.title}>Capture Error</h1>
          </div>
          <p className={PAGE_HEADER.subtitle}>
            Paste any error or upload a screenshot
          </p>
        </div>
      </div>

      <div className={`flex-1 overflow-auto ${SPACING.page.all} ${SPACING.container.sm} mx-auto w-full`}>

      {status === 'success' ? (
        <div className={`${COLORS.semantic.success.bg} ${COLORS.semantic.success.border} border rounded-lg p-6 text-center`}>
          <CheckCircle className={`h-12 w-12 ${COLORS.semantic.success.text} mx-auto mb-3`} />
          <h2 className={`text-lg font-semibold ${COLORS.semantic.success.text}`}>Error captured!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handlePasteFromClipboard}
              className="flex-1"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Paste from Clipboard
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Screenshot
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Image Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-lg p-6 mb-4 transition-colors
              ${isDragging 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-muted-foreground/30 hover:border-muted-foreground/50'
              }
              ${previewImage ? 'bg-muted/20' : ''}
            `}
          >
            {previewImage ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Screenshot Preview
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <img
                  src={previewImage}
                  alt="Screenshot preview"
                  className="max-h-48 rounded border border-border mx-auto"
                />
                {ocrStatus === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting text... {ocrProgress}%
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {ocrStatus === 'success' && (
                  <p className="text-sm text-emerald-400 text-center flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Text extracted! Edit below if needed.
                  </p>
                )}
                {ocrStatus === 'error' && (
                  <p className="text-sm text-red-400 text-center">
                    Could not extract text. Try a clearer image or paste manually.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Drag & drop a screenshot here, or click "Scan Screenshot"
                </p>
                <p className="text-xs mt-1 opacity-70">
                  Supports PNG, JPG, WebP
                </p>
              </div>
            )}
          </div>

          {/* Error Input */}
          <textarea
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder="Paste your error here...

Examples:
- Terminal errors (npm, build failures)
- Browser console errors
- TypeScript/ESLint errors
- Stack traces
- Any error message!"
            className="w-full h-64 p-4 bg-background border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!errorText.trim() || isProcessing}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating task...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Task from Error
              </>
            )}
          </Button>

          {status === 'error' && (
            <p className="text-red-400 text-sm mt-2 text-center">
              Failed to create task. Please try again.
            </p>
          )}
        </>
      )}

      {/* Tips */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-medium mb-2">Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- Copy the full error including stack trace for better context</li>
          <li>- File paths help auto-detect which project the error belongs to</li>
          <li>- Screenshots work best with clear, readable text</li>
          <li>- OCR works locally in your browser (no data sent to servers)</li>
          <li>- Errors are created as high-priority tasks</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
