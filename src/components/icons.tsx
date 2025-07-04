

import {
  Users,
  LayoutGrid,
  PlusCircle,
  IndianRupee,
  ArrowRightLeft,
  Settings,
  LogOut,
  Home,
  CreditCard,
  FileText,
  UserPlus,
  LogIn,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit3,
  ShieldCheck,
  Wallet,
  Landmark,
  GanttChartSquare,
  CalendarDays,
  Mail,
  ArrowRight,
  PieChart,
  History,
  Undo2,
  GitMerge,
  Atom,
  Coins,
  BarChart3,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
  Menu,
  Upload,
  ClipboardCopy,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from "@/lib/utils";

const QuantumLogo = ({className}: {className?: string}) => (
    <svg 
        viewBox="0 0 100 100"
        className={cn("h-8 w-8", className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
    >
        <path 
            d="M50 2.5C23.79 2.5 2.5 23.79 2.5 50C2.5 76.21 23.79 97.5 50 97.5C76.21 97.5 97.5 76.21 97.5 50" 
            stroke="hsl(var(--primary))" 
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="0.2 0.8"
            strokeDashoffset="0.15"
        />
        <path 
            d="M50 2.5C76.21 2.5 97.5 23.79 97.5 50C97.5 76.21 76.21 97.5 50 97.5"
            stroke="hsl(var(--primary))" 
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="0.2 0.8"
            strokeDashoffset="-0.15"
        />
        <circle cx="50" cy="50" r="10" fill="hsl(var(--primary) / 0.5)"/>
        <circle cx="50" cy="50" r="5" fill="hsl(var(--primary))"/>
    </svg>
);


export const Icons = {
  Users,
  Dashboard: LayoutGrid,
  Add: PlusCircle,
  Currency: Coins,
  Settle: GitMerge,
  Settings,
  Logout: LogOut,
  Home,
  Expense: CreditCard,
  Details: FileText,
  UserPlus,
  Signup: UserPlus,
  Login: LogIn,
  ChevronDown,
  MoreHorizontal,
  Delete: Trash2,
  Edit: Edit3,
  Calendar: CalendarDays,
  ShieldCheck,
  Wallet,
  Landmark,
  AppLogo: QuantumLogo,
  Logo: QuantumLogo,
  Mail,
  ArrowRight,
  Analysis: BarChart3,
  History,
  Restore: Undo2,
  Search,
  SearchX,
  Filter: SlidersHorizontal,
  Close: X,
  Menu,
  Upload,
  Copy: ClipboardCopy,
  TrendingUp,
  TrendingDown,
  Google: ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)}>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.98-4.66 1.98-3.56 0-6.21-2.76-6.21-6.22s2.65-6.22 6.21-6.22c1.98 0 3.06.83 3.82 1.56l2.6-2.58C18.04 3.82 15.61 2.5 12.48 2.5c-5.48 0-9.88 4.4-9.88 9.88s4.4 9.88 9.88 9.88c2.8 0 4.93-1 6.5-2.62 1.63-1.62 2.1-4.2 2.1-6.62 0-.6-.05-1.16-.16-1.72h-8.28z" fill="currentColor"></path>
    </svg>
  ),
  Github: ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  Linkedin: ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.15 0-2.08-.926-2.08-2.065 0-1.138.93-2.066 2.08-2.066s2.08.928 2.08 2.066c0 1.139-.93 2.065-2.08 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  ),
  Link: ({ className }: { className?: string }) => (
     <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4", className)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
    </svg>
  ),
  NextJs: ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 76 76" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", className)}><path d="M38 0C17.013 0 0 17.013 0 38s17.013 38 38 38 38-17.013 38-38S58.987 0 38 0zm21.563 56h-6.531V26.85L27.563 56H21V20h6.531v29.15L53.001 20h6.562v36z"></path></svg>
  ),
  ReactLogo: ({ className }: { className?: string }) => (
    <svg role="img" className={cn("h-5 w-5", className)} viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="0" cy="0" r="1" fill="currentColor"></circle><g stroke="currentColor" strokeWidth="1" fill="none"><ellipse rx="10" ry="3.45"></ellipse><ellipse rx="10" ry="3.45" transform="rotate(60)"></ellipse><ellipse rx="10" ry="3.45" transform="rotate(120)"></ellipse></g></svg>
  ),
  FirebaseLogo: ({ className }: { className?: string }) => (
    <svg role="img" className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.24 3.66L3.37 19.02c-.4.69.05 1.58.84 1.58h17.74c.79 0 1.24-.89.84-1.58L13.92 3.66a.985.985 0 00-1.68 0z" opacity=".25"></path><path d="M12.24 3.66L3.37 19.02c-.4.69.05 1.58.84 1.58h4.49l8.03-13.9-4.49 7.78c-.4.69-1.28.69-1.68 0L9.12 12.3l3.12-8.64z"></path></svg>
  ),
  TailwindLogo: ({ className }: { className?: string }) => (
    <svg role="img" className={cn("h-5 w-5", className)} fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8.007 8.257c.29.545.437 1.06.437 1.734 0 1.545-.96 2.488-2.58 2.488-1.56 0-2.618-.943-2.618-2.678 0-1.83 1.1-2.91 2.73-2.91.438 0 .84.14 1.15.394.02.015.03.02.04.02s.013-.005.02-.02c-.15-.24-.465-.66-.465-1.29 0-1.02.73-1.635 1.76-1.635.885 0 1.515.54 1.515 1.545 0 .825-.435 1.44-1.2 2.145l-1.035.96zM15.12 8c0 4.02-3.15 7.17-7.17 7.17S.78 12.02.78 8 .78.83 4.8.83s7.17 3.15 7.17 7.17zm-1.8 0c0-3.09-2.43-5.52-5.37-5.52S2.58 4.91 2.58 8s2.43 5.52 5.37 5.52 5.37-2.43 5.37-5.52z"></path></svg>
  ),
  ShadcnLogo: ({ className }: { className?: string }) => (
     <svg role="img" className={cn("h-5 w-5", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208.33,88.42a8,8,0,0,1,7.44,12.39L128,192,40.23,100.81a8,8,0,0,1,7.44-12.39H208.33M208.33,72.42H48.67a16,16,0,0,0-14.88,24.78l87.77,91.19a8,8,0,0,0,12.23,0l87.77-91.19A16,16,0,0,0,208.33,72.42Z"></path></svg>
  ),
  GenkitLogo: ({ className }: { className?: string }) => (
    <svg role="img" className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.24434 20.9407 6.75841 19.1662 5M12 2V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M19.1662 5C19.1662 5 18.4234 8.71078 15.5 10.5C12.5766 12.2892 12 15.5 12 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 15.5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
  ),
};

export type IconName = keyof typeof Icons;
