
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
        <PickerPanel color={color} setColor={setColor} />
      </PopoverContent>
    </Popover>
  );
}

const PickerPanel = ({ color, setColor }: { color: string; setColor: (color: string) => void; }) => {
  const solids = [
    '#E2E2E2', '#ff75c3', '#ffa647', '#ffe83f', '#99e543', '#24d0ed',
    '#2f7cf0', '#b4387d', '#c92a2a', '#828282', '#4D4D4D', '#000000',
  ];

  return (
    <Tabs defaultValue="picker" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger className="flex-1" value="picker">
          Picker
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="solid">
          Swatches
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

      <TabsContent value="picker" className="mt-0 space-y-4">
        <SaturationValuePicker color={color} setColor={setColor} />
        <HueSlider color={color} setColor={setColor} />
      </TabsContent>
    </Tabs>
  );
};


function hslStringToHsl(hslString: string): { h: number, s: number, l: number } {
  const parts = hslString.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
  if (!parts) return { h: 0, s: 0, l: 0 };
  return { h: parseFloat(parts[1]), s: parseFloat(parts[2]), l: parseFloat(parts[3]) };
}

const SaturationValuePicker = ({color, setColor}: {color: string, setColor: (color: string) => void}) => {
    const { h } = hslStringToHsl(color);

    const pickerRef = React.useRef<HTMLDivElement>(null);
    
    const handleColorSelect = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
        if (!pickerRef.current) return;
        const rect = pickerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        const s = (x / rect.width) * 100;
        const l = 100 - (y / rect.height) * 100;
        
        // This is a simplification. For a true HSL picker this needs more complex math
        // to keep hue and lightness correct while changing saturation and vice versa.
        // For now we map x to saturation and y to lightness directly.
        const newLightness = 50 * (2 - s/100) * (y / rect.height);
        const newSaturation = (s / 100) * (1 - Math.abs(2 * newLightness/100 -1)) * 100;

        let newL = 100 - (y / rect.height) * 100;
        let newS = (x / rect.width) * 100;

        setColor(`hsl(${h}, ${newS}%, ${newL}%)`);
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        handleColorSelect(e.nativeEvent);
        const onMouseMove = (event: MouseEvent) => handleColorSelect(event);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const {s, l} = hslStringToHsl(color);
    const xPos = s;
    const yPos = 100-l;

    return (
        <div ref={pickerRef} onMouseDown={handleMouseDown} className="w-56 h-40 rounded-md cursor-crosshair relative" style={{backgroundColor: `hsl(${h}, 100%, 50%)`}}>
            <div className="absolute inset-0" style={{background: 'linear-gradient(to right, white, transparent)'}} />
            <div className="absolute inset-0" style={{background: 'linear-gradient(to top, black, transparent)'}} />
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
    )
}

const HueSlider = ({color, setColor}: {color: string, onHueChange?: (h: number) => void, setColor: (color: string) => void}) => {
    const { h, s, l } = hslStringToHsl(color);
    const sliderRef = React.useRef<HTMLDivElement>(null);

    const handleHueChange = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newHue = (x / rect.width) * 360;
        setColor(`hsl(${newHue}, ${s}%, ${l}%)`);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        handleHueChange(e.nativeEvent);
        const onMouseMove = (event: MouseEvent) => handleHueChange(event);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const xPos = (h / 360) * 100;
    
    return (
        <div ref={sliderRef} onMouseDown={handleMouseDown} className="w-56 h-4 rounded-md cursor-pointer relative" style={{background: 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)'}}>
             <div 
                className="absolute h-6 w-1 rounded-full border-2 border-white shadow-md bg-transparent" 
                style={{ 
                    left: `${xPos}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
             />
        </div>
    );
};
