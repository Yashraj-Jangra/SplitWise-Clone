'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatPanel } from './chat-panel';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            "flex items-center gap-2.5 h-10 px-3.5 rounded-xl backdrop-blur-md transition-all font-medium text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shadow-lg hover:shadow-xl",
            isOpen
              ? "bg-muted/80 border border-border/70 text-foreground"
              : "bg-background/90 dark:bg-background/80 border border-border/40 text-foreground hover:bg-muted/40 hover:border-border/60"
          )}
          title={isOpen ? "Close Assistant" : "Open AI Financial Assistant"}
          aria-label="Toggle AI Assistant"
          aria-expanded={isOpen}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/40 text-foreground">
            <Icons.Bot className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-medium">Assistant</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </motion.button>
      </div>

      {/* ── Mobile Drawer (Bottom Sheet per Modal System Rule 6) ──────── */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            className="h-[88vh] max-h-[88dvh] flex flex-col rounded-t-2xl border-t border-border/30 p-0 bg-background/95 backdrop-blur-xl overflow-hidden overflow-x-hidden [&>button]:hidden shadow-2xl"
          >
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-2.5 mb-1 flex-shrink-0" />
            <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
          </SheetContent>
        </Sheet>
      ) : (
        /* ── Desktop Floating Popover Window per Modal System Rule 1 ─── */
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-20 right-6 z-50 w-[430px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100dvh-110px)] rounded-2xl border border-border/30 dark:border-border/20 shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden overflow-x-hidden bg-background/95 backdrop-blur-xl flex flex-col ring-1 ring-border/20"
            >
              <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
