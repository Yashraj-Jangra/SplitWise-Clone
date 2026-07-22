# High-Density Solid Modern Minimalist System

This document outlines the UI/UX design system, spatial rules, component patterns, and layout guidelines for the admin panel and application interfaces.

---

## 🎨 Design Philosophy & Aesthetics

1. **No AI Gloss & Zero Backdrop Blurs (Top Bar Exception)**:
   - Strictly avoid shiny gradient overlays, glossy reflections, glowing neon borders (`border-primary/20 animate-pulse`), and translucent glossy card reflections.
   - Use clean, solid neutral background colors (`bg-card`, `bg-background`, `bg-muted/40`) with crisp, defined borders (`border border-border`).
   - *Top Navigation Header Exception*: The top header navbar (`AdminHeader`) uses a glassmorphism backdrop blur (`sticky top-0 z-40 bg-background/70 border-b border-border/40 backdrop-blur-md`) to match the sticky glass scrolling behavior of the main app navigation bar.

2. **Neutral Colors & Crisp Tone**:
   - Use neutral, monochrome palette for structural elements (`bg-card`, `bg-background`, `border-border`, `text-foreground`, `text-muted-foreground`).
   - Badges, filters, and status tags use solid neutral styling (`bg-muted text-foreground border border-border`) or subtle muted tints only where status requires.

3. **Less Roundness (Tight Geometric Radii)**:
   - Avoid oversized rounded pills (`rounded-3xl`, `rounded-full`, `rounded-2xl`).
   - Cards & Dialog Containers: Compact `rounded-lg` or `rounded-xl`.
   - Control Bars, Inputs, Selects, Action Buttons, & Badges: Tight `rounded-md` or `rounded-lg`.

4. **High Density & Maximum Content Utilization**:
   - Minimize empty whitespace and oversized margins.
   - Component Card padding is tightly scoped to `p-3.5` or `p-4` (never `p-6` or `p-8`).
   - Vertical container spacing uses compact `space-y-3` or `gap-3`.
   - Data tables use dense row paddings (`py-2` to `py-2.5`), fitting 30–50% more records per screen.

5. **Bigger, Punchier & High-Contrast Typography**:
   - Page Titles: Extra bold, high-contrast headings (`text-xl font-bold` to `text-2xl font-black text-foreground`).
   - Key Stat Counters: Large, high-visibility numbers (`text-3xl` to `text-4xl font-black font-mono tracking-tight text-foreground`).
   - Micro-Labels & Headers: Crisp uppercase tracking labels (`text-[10px]` or `text-xs font-bold uppercase tracking-wider text-muted-foreground`).

6. **Docked Sticky Control Bars**:
   - Search inputs, filters, and selection actions are consolidated into a single compact sticky bar positioned directly under the top header (`sticky top-[48px]` or `top-[56px]` `z-30`).
   - Solid neutral background (`bg-card border border-border shadow-sm rounded-lg p-1.5`).

---

## 💻 Standard Component Structure (`tsx`)

```tsx
/* High-Density Card Pattern */
<Card className="border border-border bg-card rounded-lg shadow-sm">
  <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-sm font-bold text-foreground">Card Title</CardTitle>
    <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground border-border">Status</Badge>
  </CardHeader>
  <CardContent className="p-3.5 space-y-2">
    <p className="text-3xl font-black font-mono text-foreground">1,248</p>
  </CardContent>
</Card>

/* High-Density Table Pattern */
<Table>
  <TableHeader>
    <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
      <TableHead className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</TableHead>
      <TableHead className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
      <TableHead className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <TableCell className="py-2 font-medium text-xs">Item Name</TableCell>
      <TableCell className="py-2"><Badge className="rounded-md bg-muted text-foreground border border-border">Active</Badge></TableCell>
      <TableCell className="py-2 text-right">
        <Button size="sm" variant="outline" className="h-7 rounded-md px-2 text-xs border-border">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```
