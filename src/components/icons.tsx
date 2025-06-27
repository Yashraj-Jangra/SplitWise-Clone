
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
  SlidersHorizontal,
  X,
  Menu,
  Upload,
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
  Filter: SlidersHorizontal,
  Close: X,
  Menu,
  Upload,
  Google: ({ className }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)}>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.98-4.66 1.98-3.56 0-6.21-2.76-6.21-6.22s2.65-6.22 6.21-6.22c1.98 0 3.06.83 3.82 1.56l2.6-2.58C18.04 3.82 15.61 2.5 12.48 2.5c-5.48 0-9.88 4.4-9.88 9.88s4.4 9.88 9.88 9.88c2.8 0 4.93-1 6.5-2.62 1.63-1.62 2.1-4.2 2.1-6.62 0-.6-.05-1.16-.16-1.72h-8.28z" fill="currentColor"></path>
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
