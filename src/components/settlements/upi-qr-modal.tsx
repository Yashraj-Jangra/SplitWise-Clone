'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFullName, getInitials } from '@/lib/utils';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';
import { notifyPaymentConfirmationRequest } from '@/lib/notification-service';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Check, Copy, ExternalLink, QrCode, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '@/types';

interface UpiQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiver: UserProfile;
  amount: number;
  groupId?: string;
  groupName?: string;
}

export function UpiQrModal({
  open,
  onOpenChange,
  receiver,
  amount,
  groupId,
  groupName,
}: UpiQrModalProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const receiverName = getFullName(receiver.firstName, receiver.lastName);
  const upiId = receiver.upiId || 'Not configured';

  // Construct valid UPI payment deep link URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(receiverName)}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`SplitIt Settlement`)}`;

  const handleCopyUpi = () => {
    if (!receiver.upiId) return;
    navigator.clipboard.writeText(receiver.upiId);
    setCopied(true);
    toast({ title: "UPI ID Copied", description: `${receiver.upiId} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestConfirmation = async () => {
    if (!userProfile) return;
    setSendingRequest(true);
    try {
      await notifyPaymentConfirmationRequest(
        userProfile.uid,
        receiver.uid,
        amount,
        groupId,
        groupName || 'Shared Expenses'
      );

      toast({
        title: "Payment Confirmation Sent",
        description: `Sent a 1-tap confirmation request to ${receiverName}. Your settlement will auto-record once confirmed!`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send Request",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] text-center p-6">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Quick-Settle UPI QR</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Scan with GPay, PhonePe, Paytm or BHIM to pay instantly
          </DialogDescription>
        </DialogHeader>

        {/* ── Receiver Profile & Amount Badge ────────────────────────────── */}
        <div className="my-3 flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3 min-w-0 text-left">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={receiver.avatarUrl} alt={receiverName} />
              <AvatarFallback>{getInitials(receiver.firstName, receiver.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{receiverName}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] truncate">{upiId}</span>
                {receiver.upiId && (
                  <button
                    onClick={handleCopyUpi}
                    className="hover:text-foreground transition-colors p-0.5"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-lg font-bold text-emerald-500">
              {CURRENCY_SYMBOL}{Number(amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* ── High-Contrast QR Code Display ──────────────────────────────── */}
        {receiver.upiId ? (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg inline-block">
              <QRCodeSVG
                value={upiUri}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5">
              Instant zero-fee transfer to <strong className="text-foreground">{receiverName}</strong>
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-amber-500 space-y-2">
            <p className="text-sm font-semibold">UPI ID Not Configured</p>
            <p className="text-xs opacity-90">
              {receiverName} has not set up their UPI ID yet. You can remind them or settle via cash/manual record.
            </p>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="mt-4 space-y-2">
          {receiver.upiId && (
            <Button
              asChild
              variant="outline"
              className="w-full h-10 rounded-xl text-xs gap-2 font-medium"
            >
              <a href={upiUri} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in UPI App (GPay / PhonePe)
              </a>
            </Button>
          )}

          <Button
            onClick={handleRequestConfirmation}
            disabled={sendingRequest || !receiver.upiId}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md transition-all gap-2"
          >
            {sendingRequest ? (
              <>
                <Icons.AppLogo className="h-4 w-4 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                I Have Paid (Request Confirmation)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
