
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFullName(firstName?: string, lastName?: string): string {
    if (!firstName) return "";
    return [firstName, lastName].filter(Boolean).join(" ");
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName) return "??";
  const firstInitial = firstName.substring(0, 1).toUpperCase();
  const lastInitial = lastName ? lastName.substring(0, 1).toUpperCase() : "";
  return `${firstInitial}${lastInitial}`;
}
