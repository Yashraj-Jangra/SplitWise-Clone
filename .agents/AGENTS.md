# Project Rules & Customizations

## Modal & Dialog Design System Rule

All modals, dialogs, drawers, and form cards in this codebase MUST follow the **Dark-Mode Glass-Pane Minimalist Modal System** defined in [`design-system.md`](file:///d:/Projects/SplitWise-Clone/design-system.md):

1. **Desktop Container (`DialogContent`)**:
   `sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background`
2. **Inner Body Padding**:
   `p-6` with `space-y-4` layout.
3. **Hero Input**:
   `text-[clamp(2rem,8vw,3rem)] font-bold text-foreground border-b-2 border-border/40 focus-within:border-primary`
4. **Form Controls & Dropdowns**:
   `h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal` for triggers/inputs; `text-sm font-medium` for labels.
5. **Action Buttons**:
   `h-10 rounded-xl text-sm font-medium px-4` (ghost/cancel) and `px-5` (primary).
6. **Mobile Parity**:
   `SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background"`
