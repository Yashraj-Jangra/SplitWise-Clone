'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { ReceiptScanResult } from '@/types/ai';

interface ReceiptScannerButtonProps {
  groupId?: string;
  onScanComplete: (result: ReceiptScanResult, receiptUrl?: string) => void;
  disabled?: boolean;
}

export function ReceiptScannerButton({
  groupId,
  onScanComplete,
  disabled,
}: ReceiptScannerButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    if (disabled || isScanning) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    e.target.value = '';

    // Validate image format
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a receipt image (JPEG, PNG, WebP).',
        variant: 'destructive',
      });
      return;
    }

    // Size limit check (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Image Too Large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    try {
      // Step 1: Upload image to OCI / S3 storage
      const formData = new FormData();
      formData.append('file', file);
      if (groupId) {
        formData.append('groupId', groupId);
      }

      const uploadRes = await fetch('/api/upload/receipt', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload receipt image');
      }

      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url;

      // Step 2: Call minimax-m3 vision OCR route
      const scanRes = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!scanRes.ok) {
        const err = await scanRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to extract bill details');
      }

      const scanResult: ReceiptScanResult = await scanRes.json();

      onScanComplete(scanResult, imageUrl);

      toast({
        title: '✨ Receipt Scanned!',
        description: scanResult.title
          ? `Extracted "${scanResult.title}" — review details before saving.`
          : 'Receipt parsed — details pre-filled in form.',
      });
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error.message || 'Could not parse receipt. Please enter details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="inline-flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isScanning}
        onClick={handleButtonClick}
        className="h-8 gap-1.5 rounded-full text-xs font-medium border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all active:scale-95"
        title="Scan paper bill or digital receipt using AI"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Icons.Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Scan Receipt</span>
          </>
        )}
      </Button>
    </div>
  );
}
