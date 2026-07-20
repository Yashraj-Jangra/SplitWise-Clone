# Dark-Mode Glass-Pane Minimalist Modal System

This document outlines the standard UI/UX design specifications, CSS rules, component structure, and reusable prompts for all modals, dialogs, and forms in this project.

---

## 🎨 Design Philosophy & Aesthetics

1. **Dark-Mode Glassmorphism Parity**: Clean, dark background (`bg-background`) with standard subtle borders (`border-border/20`), 2xl border radius (`rounded-2xl`), and heavy drop shadow (`shadow-2xl`).
2. **Strict Spatial Layout**:
   - Desktop: Maximum width `480px` (`sm:max-w-[480px]`), zero outer container padding (`p-0`), overflow hidden (`overflow-hidden`).
   - Mobile: Bottom drawer sheet (`SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background"`).
   - Inner Form: Exactly `24px` (`p-6`) padding on left, right, top, and bottom.
3. **Hero Currency / Title Input**:
   - Responsive fluid font sizing: `text-[clamp(2rem,8vw,3rem)] font-bold`.
   - Borderless transparent input with a subtle bottom underline (`border-b-2 border-border/40 focus-within:border-primary transition-colors`).
4. **Form Controls & Dropdowns**:
   - `h-11` height, `rounded-xl` border radius, `bg-muted/20` subtle tint, `border-border/30`.
   - Font size: `text-sm font-normal` for inputs and select triggers; `text-sm font-medium` for field labels.
5. **Action Buttons**:
   - Height `h-10`, radius `rounded-xl`, font size `text-sm font-medium`.
   - Primary button: `bg-primary text-primary-foreground hover:bg-primary/90 px-5`.
   - Secondary / Ghost button: `variant="ghost" border-border/30 hover:bg-accent px-4`.

---

## 💬 Reusable Master Prompt for Future Features

Copy and paste this prompt whenever you want AI assistants or developers to build modal interfaces in this project:

```text
Design a sleek, dark-mode minimalist modal for [Feature Name] matching our core modal design system:
- Container: sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background.
- Header: DialogHeader with text-lg font-semibold title.
- Inner Body Padding: p-6 space-y-4.
- Hero Input: Centered borderless currency/value input using text-[clamp(2rem,8vw,3rem)] font-bold text-foreground border-b-2 border-border/40 focus-within:border-primary.
- Field Controls: h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal for select triggers and pill inputs; text-sm font-medium for labels.
- Footer: DialogFooter with p-6 pt-0 flex flex-row items-center justify-end gap-2 using h-10 rounded-xl text-sm font-medium buttons.
- Mobile Parity: SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl border-border/20 p-0 bg-background".
```

---

## 💻 Technical Code Template (`tsx`)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>{trigger}</DialogTrigger>
  <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/20 rounded-2xl shadow-2xl bg-background">
    <div className="flex flex-col h-full">
      
      {/* ── Form Body (24px padding) ── */}
      <div className="p-6 space-y-4">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-lg font-semibold">Title Here</DialogTitle>
        </DialogHeader>

        {/* Hero Input */}
        <div className="relative border-b-2 border-border/40 pb-2 flex items-center justify-center max-w-[280px] mx-auto focus-within:border-primary">
          <span className="text-[clamp(2rem,8vw,3rem)] font-bold text-muted-foreground mr-1">₹</span>
          <input
            type="number"
            placeholder="0.00"
            className="w-full bg-transparent text-[clamp(2rem,8vw,3rem)] font-bold text-center focus:outline-none border-none p-0"
          />
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Label</label>
            <Select>
              <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border/30 text-sm font-normal">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <DialogFooter className="p-6 pt-0 flex flex-row items-center justify-end gap-2">
        <Button variant="ghost" className="rounded-xl h-10 text-sm font-medium px-4">Cancel</Button>
        <Button className="rounded-xl h-10 text-sm font-medium px-5 bg-primary text-primary-foreground">Save</Button>
      </DialogFooter>

    </div>
  </DialogContent>
</Dialog>
```
