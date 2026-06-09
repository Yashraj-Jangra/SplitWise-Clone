
"use client";

import { useState, useEffect } from 'react';

export function DynamicYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setYear(new Date().getFullYear());
  }, []);

  // During server-rendering and the initial client render, `year` will be `null`,
  // so nothing is rendered. After hydration, the effect runs and the correct year is displayed.
  // This prevents a server/client mismatch.
  return <>{year}</>;
}
