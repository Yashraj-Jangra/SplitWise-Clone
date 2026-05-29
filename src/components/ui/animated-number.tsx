'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  isCurrency?: boolean;
}

export function AnimatedNumber({ value, className, prefix = '', isCurrency = true }: AnimatedNumberProps) {
  const [hasMounted, setHasMounted] = useState(false);
  
  // Spring config for the odometer effect
  const spring = useSpring(value, {
    stiffness: 75,
    damping: 15,
    mass: 1,
  });

  // Effect to update the spring when the prop changes
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Transform the raw spring number into a formatted string
  const display = useTransform(spring, (current) => {
    const absValue = Math.abs(current);
    const sign = current < 0 ? '−' : current > 0 ? '+' : '';
    const formattedNumber = absValue.toFixed(2);
    
    if (isCurrency) {
      return `${sign}${prefix}${CURRENCY_SYMBOL}${formattedNumber}`;
    }
    return `${sign}${prefix}${formattedNumber}`;
  });

  // Use semantic color classes based on the actual value (not the spring value, to avoid color flickering during transition to zero)
  const colorClass = value > 0.01 ? 'text-money-positive' : value < -0.01 ? 'text-money-negative' : 'text-foreground';

  if (!hasMounted) {
    // Initial server render
    const absValue = Math.abs(value);
    const sign = value < 0 ? '−' : value > 0 ? '+' : '';
    const text = isCurrency 
      ? `${sign}${prefix}${CURRENCY_SYMBOL}${absValue.toFixed(2)}`
      : `${sign}${prefix}${absValue.toFixed(2)}`;
      
    return <span className={cn(colorClass, className)}>{text}</span>;
  }

  return (
    <motion.span className={cn(colorClass, className)}>
      {display}
    </motion.span>
  );
}
