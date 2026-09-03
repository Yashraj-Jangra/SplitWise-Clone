'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatPanel } from './chat-panel';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence, motion } from 'framer-motion';

export function AIChatWidget() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Do not show the floating widget on the full /assistant page or admin/auth routes
  if (pathname === '/assistant' || pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* ── Floating Modern Minimal Trigger Button ─────────────────────── */}
      <div className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-40">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-background border border-border/40 text-foreground shadow-lg hover:bg-muted/40 hover:border-border/60 transition-all font-medium text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          title="Open AI Financial Assistant"
          aria-label="Open AI Assistant"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/40 text-foreground">
            <Icons.Bot className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-medium">Assistant</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </motion.button>
      </div>

      {/* ── Mobile Drawer (Bottom Sheet per Modal System Rule 6) ──────── */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background overflow-hidden">
            <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
          </SheetContent>
        </Sheet>
      ) : (
        /* ── Desktop Floating Popover Window per Modal System Rule 1 ─── */
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed bottom-20 right-6 z-50 w-[420px] h-[580px] rounded-2xl border border-border/30 shadow-2xl overflow-hidden bg-background flex flex-col"
            >
              <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
