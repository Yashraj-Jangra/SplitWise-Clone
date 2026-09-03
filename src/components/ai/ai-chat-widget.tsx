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
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-40">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
          title="Ask SplitIt AI"
          aria-label="Open AI Assistant"
        >
          <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping opacity-40 group-hover:opacity-60" />
          <Icons.Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
        </motion.button>
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-2xl border-border/40 overflow-hidden flex flex-col bg-background">
            <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop Floating Popover Window */
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed bottom-22 right-6 z-50 w-[390px] h-[540px] rounded-2xl border border-border/60 shadow-2xl overflow-hidden bg-background flex flex-col"
            >
              <ChatPanel onClose={() => setIsOpen(false)} className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
