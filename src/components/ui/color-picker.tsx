

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paintbrush, Copy } from 'lucide-react';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

// --- Color Conversion Utilities ---

function hslStringToHsla(hslString: string): { h: number; s: number; l: number; a: number } {
  const parts = hslString.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/i);
  if (!parts) return { h: 0, s: 0, l: 100, a: 1 };
  return { h: parseFloat(parts[1]), s: parseFloat(parts[2]), l: parseFloat(parts[3]), a: 1 };
}

function hslaToRgba(h: number, s: number, l: number, a: number): { r: number; g: number; b: number; a: number } {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (60 <= h && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (120 <= h && h < 180) { [r, g, b] = [0, c, x]; }
  else if (180 <= h && h < 240) { [r, g, b] = [0, x, c]; }
  else if (240 <= h && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (300 <= h && h < 360) { [r, g, b] = [c, 0, x]; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return { r, g, b, a };
}

function rgbaToHsla(r: number, g: number, b: number, a: number): { h: number; s: number; l: number; a: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100, a };
}

function hslToHsv(h: number, s: number, l: number): { h: number; s: number; v: number } {
    s /= 100;
    l /= 100;
    const v = l + s * Math.min(l, 1 - l);
    const newS = v === 0 ? 0 : 2 * (1 - l / v);
    return { h, s: newS * 100, v: v * 100 };
}

function hsvToHsl(h: number, s: number, v: number): { h: number; s: number; l: number } {
    s /= 100;
    v /= 100;
    const l = v * (1 - s / 2);
    const newS = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
    return { h, s: newS * 100, l: l * 100 };
}

function componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}

function rgbaToHex(r: number, g: number, b: number): string {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 1
    } : { r: 0, g: 0, b: 0, a: 1 };
}

export interface ColorPickerProps extends React.HTMLAttributes<HTMLDivElement> {
  color: string;
  setColor: (color: string) => void;
}

export function ColorPicker({ color, setColor, className }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !color && 'text-muted-foreground',
            className
          )}
        >
          <div className="w-full flex items-center gap-2">
            {color ? (
              <div
                className="h-4 w-4 rounded !bg-center !bg-cover transition-all"
                style={{ background: color }}
              ></div>
            ) : (
              <Paintbrush className="h-4 w-4" />
            )}
            <div className="truncate flex-1">{color ? color : 'Pick a color'}</div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0" align="start">
        <div className="p-4 rounded-lg shadow-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
          <PickerPanel color={color} setColor={setColor} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const PickerPanel = ({ color, setColor }: { color: string; setColor: (color: string) => void; }) => {
  const { toast } = useToast();
  const hsla = useMemo(() => hslStringToHsla(color), [color]);
  const rgba = useMemo(() => hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a), [hsla]);

  const [hexValue, setHexValue] = React.useState(rgbaToHex(rgba.r, rgba.g, rgba.b));
  
  React.useEffect(() => {
    setHexValue(rgbaToHex(rgba.r, rgba.g, rgba.b));
  }, [rgba]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexValue(newHex);
    if (/^#[0-9A-F]{6}$/i.test(newHex)) {
      const newRgba = hexToRgba(newHex);
      const newHsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
      setColor(`hsl(${newHsla.h}, ${newHsla.s}%, ${newHsla.l}%)`);
    }
  };

  const solids = [
    '#000000', '#FFFFFF', '#FF0000', '#FF7A00', '#FFD400', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#800080',
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard.` });
  };

  return (
    <div className="grid grid-cols-[280px_auto] gap-6 font-sans">
        <div className="flex flex-col gap-4">
            <div className="w-full h-24 rounded-lg border border-zinc-700" style={{ backgroundColor: color }} />
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-zinc-400 w-12">HEX</label>
                    <Input value={hexValue} onChange={handleHexChange} className="h-8 flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-md focus-visible:ring-offset-0 focus-visible:ring-primary/50" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={() => copyToClipboard(hexValue)}><Copy /></Button>
                </div>
                 <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-zinc-400 w-12">RGB</label>
                    <Input value={rgba.r} readOnly className="h-8 flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-md" />
                    <Input value={rgba.g} readOnly className="h-8 flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-md" />
                    <Input value={rgba.b} readOnly className="h-8 flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-md" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={() => copyToClipboard(`rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`)}><Copy /></Button>
                </div>
            </div>
             <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Basic Colours</label>
                <div className="flex flex-wrap gap-2">
                    {solids.map((s) => (
                        <div
                            key={s}
                            style={{ background: s }}
                            className="rounded-full h-5 w-5 cursor-pointer active:scale-105 border border-zinc-600"
                            onClick={() => {
                                const newRgba = hexToRgba(s);
                                const newHsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
                                setColor(`hsl(${newHsla.h}, ${newHsla.s}%, ${newHsla.l}%)`);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>

        <div className="flex gap-4">
            <SaturationValuePicker hsla={hsla} setColor={setColor} color={color} />
            <HueSlider hsla={hsla} setColor={setColor} />
        </div>
    </div>
  );
};

const SaturationValuePicker = ({ hsla, setColor, color }: { hsla: { h: number; s: number; l: number; a: number }; setColor: (color: string) => void; color: string; }) => {
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const hsv = useMemo(() => hslToHsv(hsla.h, hsla.s, hsla.l), [hsla]);

  const handleColorSelect = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const newS = (x / rect.width) * 100;
    const newV = 100 - (y / rect.height) * 100;
    const newHsl = hsvToHsl(hsv.h, newS, newV);
    
    setColor(`hsl(${newHsl.h}, ${newHsl.s}%, ${newHsl.l}%)`);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleColorSelect(e.nativeEvent);
    const onMouseMove = (event: MouseEvent) => handleColorSelect(event);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  const xPos = hsv.s;
  const yPos = 100 - hsv.v;

  return (
    <div
      ref={pickerRef}
      onMouseDown={handleMouseDown}
      className="w-56 h-56 rounded-lg cursor-crosshair relative"
      style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
    >
      <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
      <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(to top, black, transparent)' }} />
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-white shadow-md"
        style={{
          left: `${xPos}%`,
          top: `${yPos}%`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
        }}
      />
    </div>
  );
};

const HueSlider = ({ hsla, setColor }: { hsla: { h: number; s: number; l: number; a: number }; setColor: (color: string) => void; }) => {
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const handleHueChange = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newHue = (y / rect.height) * 360;
    setColor(`hsl(${newHue}, ${hsla.s}%, ${hsla.l}%)`);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleHueChange(e.nativeEvent);
    const onMouseMove = (event: MouseEvent) => handleHueChange(event);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  const yPos = (hsla.h / 360) * 100;

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      className="w-6 h-56 rounded-full cursor-pointer relative"
      style={{ background: 'linear-gradient(to top, red, yellow, lime, cyan, blue, magenta, red)' }}
    >
      <div
        className="absolute h-5 w-5 rounded-full border-2 border-white shadow-lg"
        style={{
          top: `${yPos}%`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: `hsl(${hsla.h}, 100%, 50%)`,
        }}
      />
    </div>
  );
};

    