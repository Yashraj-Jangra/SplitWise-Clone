
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
};

export type IconName = keyof typeof Icons;
