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
import { notifyPaymentPing } from '@/lib/notification-service';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Check, Copy, ExternalLink, QrCode, Bell, Info } from 'lucide-react';
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
  const [sendingPing, setSendingPing] = useState(false);

  const receiverName = getFullName(receiver.firstName, receiver.lastName);
  const upiId = receiver.upiId || '';

  // Construct valid UPI payment deep link URI
  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(receiverName)}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('SplitWise Settlement')}`
    : '';

  const handleCopyUpi = () => {
    if (!receiver.upiId) return;
    navigator.clipboard.writeText(receiver.upiId);
    setCopied(true);
    toast({ title: "UPI ID Copied", description: `${receiver.upiId} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePingRecipient = async () => {
    if (!userProfile) return;
    setSendingPing(true);
    try {
      await notifyPaymentPing(
        userProfile.uid,
        receiver.uid,
        amount,
        receiver.upiId,
        groupId,
        groupName || 'Shared Expenses'
      );

      toast({
        title: "Notification Sent!",
        description: `Notified ${receiverName} that you sent ₹${Number(amount || 0).toFixed(2)} via UPI.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send Notification",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setSendingPing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
        <div className="p-6 space-y-4 text-center">
          <DialogHeader className="text-center items-center space-y-1.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <QrCode className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold font-headline">Quick-Settle UPI QR</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan with GPay, PhonePe, Paytm, or BHIM to transfer directly
            </DialogDescription>
          </DialogHeader>

          {/* ── Receiver Profile & Amount Card ────────────────────────────── */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-3 min-w-0 text-left">
              <Avatar className="h-10 w-10 flex-shrink-0 border border-border/40">
                <AvatarImage src={receiver.avatarUrl} alt={receiverName} />
                <AvatarFallback>{getInitials(receiver.firstName, receiver.lastName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{receiverName}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] truncate">{upiId || 'No UPI ID set'}</span>
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
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Amount</p>
              <p className="text-lg font-bold text-emerald-500">
                {CURRENCY_SYMBOL}{Number(amount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* ── High-Contrast QR Code Display ──────────────────────────────── */}
          {receiver.upiId ? (
            <div className="flex flex-col items-center justify-center py-1 space-y-2">
              <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg inline-block">
                <QRCodeSVG
                  value={upiUri}
                  size={170}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Direct zero-fee transfer to <strong className="text-foreground">{receiverName}</strong>
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-amber-500 space-y-1.5">
              <p className="text-sm font-semibold">UPI ID Not Configured</p>
              <p className="text-xs opacity-90">
                {receiverName} has not added their UPI ID to their profile yet. You can ping them or record a manual cash settlement.
              </p>
            </div>
          )}

          {/* ── Disclaimer Banner ────────────────────────────────────────────── */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-left flex items-start gap-2.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> Splitwise is a 100% free platform with zero usage fees. We do not directly process or track banking payments. Please manually record the settlement once transferred.
            </p>
          </div>

          {/* ── Actions ────────────────────────────────────────────────────── */}
          <div className="space-y-2 pt-1">
            {receiver.upiId && (
              <Button
                asChild
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md transition-all gap-2"
              >
                <a href={upiUri} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in UPI App (GPay / PhonePe / Paytm)
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handlePingRecipient}
              disabled={sendingPing}
              className="w-full h-10 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border-border/30 gap-2"
            >
              {sendingPing ? (
                <>
                  <Icons.AppLogo className="h-4 w-4 animate-spin" />
                  Sending Notification...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 text-primary" />
                  Notify {receiverName} (I've Paid via UPI)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
