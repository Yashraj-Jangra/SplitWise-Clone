
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paintbrush } from 'lucide-react';
import { useMemo } from 'react';

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
        <GradientPicker color={color} setColor={setColor} />
      </PopoverContent>
    </Popover>
  );
}

const GradientPicker = ({ color, setColor }: { color: string; setColor: (color: string) => void; }) => {
  const solids = [
    '#E2E2E2',
    '#ff75c3',
    '#ffa647',
    '#ffe83f',
    '#99e543',
    '#24d0ed',
    '#2f7cf0',
    '#b4387d',
    '#c92a2a',
    '#828282',
    '#4D4D4D',
    '#000000',
  ];

  return (
    <Tabs defaultValue="solid" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger className="flex-1" value="solid">
          Solid
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="gradient">
          Gradient
        </TabsTrigger>
      </TabsList>

      <TabsContent value="solid" className="flex flex-wrap gap-1 mt-0">
        {solids.map((s) => (
          <div
            key={s}
            style={{ background: s }}
            className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
            onClick={() => setColor(s)}
          />
        ))}
      </TabsContent>

      <TabsContent value="gradient" className="mt-0">
        <GradientTabs color={color} setColor={setColor} />
      </TabsContent>
    </Tabs>
  );
};


function toRgb(hex: string): { r: number, g: number, b: number } {
  let r = 0, g = 0, b = 0;
  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  // 6 digits
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return { r, g, b };
}

function fromRgb(r: number, g: number, b: number): string {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function fromHsl(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


function toHsl(hex: string): { h: number, s: number, l: number } {
  const {r: r255, g: r255_g, b: r255_b} = toRgb(hex);
  
  let r = r255 / 255, g = r255_g / 255, b = r255_b / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

const GradientTabs = ({ color, setColor }: { color: string; setColor: (color: string) => void; }) => {
  const [activeTab, setActiveTab] = React.useState('HEX');

  const {h, s, l} = useMemo(() => {
    if (color.startsWith('hsl')) {
      const parts = color.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
      if (parts) {
        return { h: parseFloat(parts[1]), s: parseFloat(parts[2]), l: parseFloat(parts[3]) };
      }
    } else if (color.startsWith('#')) {
      return toHsl(color);
    }
    return { h: 0, s: 100, l: 50 };
  }, [color]);
  
  const { r, g, b } = useMemo(() => toRgb(fromHsl(h,s,l)), [h,s,l]);

  const onHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(newHex) || /^#[0-9A-F]{3}$/i.test(newHex)) {
      setColor(newHex);
    }
  };

  const onRgbChange = (part: 'r'|'g'|'b', value: number) => {
    if (value >= 0 && value <= 255) {
      setColor(fromRgb(part === 'r' ? value : r, part === 'g' ? value : g, part === 'b' ? value : b));
    }
  };

  const onHslChange = (part: 'h'|'s'|'l', value: number) => {
     if (value >= 0 && (part === 'h' ? value <= 360 : value <= 100)) {
        const newH = part === 'h' ? value : h;
        const newS = part === 's' ? value : s;
        const newL = part === 'l' ? value : l;
        setColor(`hsl(${newH}, ${newS}%, ${newL}%)`);
     }
  }
  
  const hexValue = useMemo(() => fromHsl(h,s,l), [h,s,l]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="w-full">
          {activeTab === 'HEX' && (
            <div className="flex items-center gap-2">
              <Input
                id="hex"
                value={hexValue}
                onChange={onHexChange}
                className="flex-1"
                aria-label="Hex"
              />
            </div>
          )}

          {activeTab === 'RGB' && (
            <div className="flex items-center gap-2">
              <Input id="r" value={r} onChange={(e) => onRgbChange('r', parseInt(e.target.value, 10))} className="w-full" aria-label="R" />
              <Input id="g" value={g} onChange={(e) => onRgbChange('g', parseInt(e.target.value, 10))} className="w-full" aria-label="G" />
              <Input id="b" value={b} onChange={(e) => onRgbChange('b', parseInt(e.target.value, 10))} className="w-full" aria-label="B" />
            </div>
          )}

          {activeTab === 'HSL' && (
            <div className="flex items-center gap-2">
              <Input id="h" value={Math.round(h)} onChange={(e) => onHslChange('h', parseInt(e.target.value, 10))} className="w-full" aria-label="H" />
              <Input id="s" value={Math.round(s)} onChange={(e) => onHslChange('s', parseInt(e.target.value, 10))} className="w-full" aria-label="S" />
              <Input id="l" value={Math.round(l)} onChange={(e) => onHslChange('l', parseInt(e.target.value, 10))} className="w-full" aria-label="L" />
            </div>
          )}
        </div>
        <div className="w-auto">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} orientation="vertical">
            <TabsList>
              <TabsTrigger value="HEX" className="px-2 py-1 h-auto text-xs">HEX</TabsTrigger>
              <TabsTrigger value="RGB" className="px-2 py-1 h-auto text-xs">RGB</TabsTrigger>
              <TabsTrigger value="HSL" className="px-2 py-1 h-auto text-xs">HSL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
       <SaturationValuePicker h={h} s={s} l={l} onSaturationChange={(newS) => onHslChange('s', newS)} onLightnessChange={(newL) => onHslChange('l', newL)} />
       <HueSlider hue={h} onHueChange={(newH) => onHslChange('h', newH)} />
    </div>
  );
};

const SaturationValuePicker = ({h, s, l, onSaturationChange, onLightnessChange}: {h:number, s:number, l:number, onSaturationChange: (s:number) => void, onLightnessChange: (l:number) => void}) => {
    const pickerRef = React.useRef<HTMLDivElement>(null);
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!pickerRef.current) return;
        
        const rect = pickerRef.current.getBoundingClientRect();
        
        const updateColor = (event: MouseEvent) => {
            const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

            const newS = (x / rect.width) * 100;
            const newV = 100 - (y / rect.height) * 100; // Value
            
            // Convert HSV to HSL
            const newL = (newV / 100) * (1 - (newS / 100) / 2) * 100;
            const newS_hsl = newL === 0 || newL === 100 ? 0 : ((newV / 100 - newL / 100) / Math.min(newL / 100, 1 - newL / 100)) * 100;
            
            onSaturationChange(newS_hsl);
            onLightnessChange(newL);
        }
        
        updateColor(e.nativeEvent);

        const handleMouseMove = (event: MouseEvent) => {
            updateColor(event);
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    // Convert HSL to HSV for positioning the cursor
    const l_norm = l / 100;
    const s_norm = s / 100;
    const v_norm = l_norm + s_norm * Math.min(l_norm, 1 - l_norm);
    const s_v_norm = v_norm === 0 ? 0 : 2 * (1 - l_norm / v_norm);
    
    const xPos = s_v_norm * 100;
    const yPos = 100 - v_norm * 100;

    return (
        <div ref={pickerRef} onMouseDown={handleMouseDown} className="w-full h-36 rounded-md cursor-crosshair mt-2 relative" style={{backgroundColor: `hsl(${h}, 100%, 50%)`}}>
            <div className="absolute inset-0" style={{background: 'linear-gradient(to right, white, transparent)'}} />
            <div className="absolute inset-0" style={{background: 'linear-gradient(to top, black, transparent)'}} />
            <div className="absolute h-3 w-3 rounded-full border-2 border-white shadow-md" style={{ left: `${xPos}%`, top: `${yPos}%`, transform: 'translate(-50%, -50%)', backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }} />
        </div>
    )
}

const HueSlider = ({hue, onHueChange}: {hue: number, onHueChange: (h: number) => void}) => {
     const sliderRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!sliderRef.current) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        
        const updateHue = (event: MouseEvent) => {
            const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
            const newHue = (y / rect.height) * 360;
            onHueChange(newHue);
        }
        
        updateHue(e.nativeEvent);

        const handleMouseMove = (event: MouseEvent) => {
            updateHue(event);
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    const yPos = (hue / 360) * 100;
    
    return (
        <div className="flex items-center gap-2 mt-2">
            <div ref={sliderRef} onMouseDown={handleMouseDown} className="w-full h-36 rounded-md cursor-pointer relative" style={{background: 'linear-gradient(to bottom, red, yellow, lime, cyan, blue, magenta, red)'}}>
                <div className="absolute h-4 w-full rounded-full border-2 border-white shadow-md -left-1/2" style={{ top: `${yPos}%`, transform: 'translateY(-50%)', backgroundColor: `hsl(${hue}, 100%, 50%)` }}/>
            </div>
        </div>
    )
}
