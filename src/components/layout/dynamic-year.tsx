"use client";

import { useState, useEffect } from 'react';

export function DynamicYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Render the year calculated on the server/initial client render as a fallback
  // until the useEffect updates the state on the client.
  // This ensures consistency for the initial render pass.
  return <>{year !== null ? year : new Date(Date.now()).getFullYear()}</>;
}
