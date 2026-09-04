'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatPanel } from './chat-panel';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';

function MobileDrawerContent({ onClose }: { onClose: () => void }) {
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        if (info.offset.y > 80 || info.velocity.y > 200) {
          onClose();
        }
      }}
      className="flex flex-col h-full w-full"
    >
      {/* ── Active Grab Handle Zone with Touch & Drag Gesture ── */}
      <div
        className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        tabIndex={-1}
        aria-label="Drag down to close assistant"
      >
        <motion.div
          animate={{
            width: isDragging ? 48 : 36,
            height: isDragging ? 5 : 4,
            backgroundColor: isDragging ? 'rgba(161, 161, 170, 0.7)' : 'rgba(161, 161, 170, 0.35)',
          }}
          transition={{ duration: 0.15 }}
          className="rounded-full"
        />
      </div>

      <ChatPanel onClose={onClose} className="flex-1" />
    </motion.div>
  );
}

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
            "flex items-center gap-2.5 h-10 px-3.5 rounded-xl transition-all font-medium text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shadow-lg hover:shadow-xl",
            isOpen
              ? "bg-muted border border-border/70 text-foreground"
              : "bg-background dark:bg-card border border-border/40 text-foreground hover:bg-muted hover:border-border/60"
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
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="h-[88vh] max-h-[88dvh] flex flex-col rounded-t-2xl border-t border-border/30 p-0 bg-background/95 backdrop-blur-xl overflow-hidden overflow-x-hidden [&>button]:hidden shadow-2xl"
          >
            <MobileDrawerContent onClose={() => setIsOpen(false)} />
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
