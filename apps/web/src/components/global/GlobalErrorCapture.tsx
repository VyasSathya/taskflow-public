/**
 * GlobalErrorCapture - Global wrapper for QuickErrorCapture
 * 
 * Provides:
 * - Global Ctrl+Shift+E keyboard shortcut
 * - Floating Action Button (FAB) for mouse users
 * - Works on all pages when placed in root layout
 */

'use client';

import { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { QuickErrorCapture, useQuickErrorCaptureShortcut } from '@/components/task/QuickErrorCapture';

export function GlobalErrorCapture() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Register global keyboard shortcut
  useQuickErrorCaptureShortcut(handleOpen);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        title="Quick Error Capture (Ctrl+Shift+E)"
        aria-label="Open Quick Error Capture"
      >
        <AlertCircle className="h-5 w-5" />
        {/* Tooltip on hover */}
        <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Capture Error
          <span className="ml-1.5 text-gray-400">Ctrl+Shift+E</span>
        </span>
      </button>

      {/* QuickErrorCapture Modal */}
      <QuickErrorCapture open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
