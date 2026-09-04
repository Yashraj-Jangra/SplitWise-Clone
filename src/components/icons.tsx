

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
  UserMinus,
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
  ArrowLeft,
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
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Layers,
  Baseline,
  LifeBuoy,
  LineChart,
  Check,
  Calendar,
  Camera,
  GripVertical,
  ShoppingBag,
  UtensilsCrossed,
  Heart,
  Bus,
  Plane,
  Car,
  Bolt,
  Droplets,
  Wifi,
  Smartphone,
  Film,
  Gamepad2,
  Music,
  Tv,
  Ticket,
  Shirt,
  Laptop,
  HeartPulse,
  University,
  Gift,
  Hotel,
  Zap,
  Flame, 
  ShoppingCart,
  Carrot,
  Coffee,
  Pizza,
  Dumbbell,
  BookOpen,
  Pill,
  Stethoscope,
  Scissors,
  Paintbrush,
  Sparkles,
  Bot,
  Receipt,
  CookingPot,
  Glasses,
  Watch,
  Globe,
  Briefcase,
  Building,
  Wrench,
  Baby,
  PawPrint,
  GraduationCap,
  Sprout,
  Train,
  Ship,
  Apple,
  Bell,
  Megaphone,
  Archive,
  BellRing,
  Info,
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
  Archive,
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
  UserMinus,
  Signup: UserPlus,
  Login: LogIn,
  ChevronDown,
  MoreHorizontal,
  Delete: Trash2,
  Edit: Edit3,
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
  GitMerge,
  Atom,
  Coins,
  BarChart3,
  Search,
  SearchX,
  Filter: SlidersHorizontal,
  Close: X,
  Menu,
  Upload,
  Copy: ClipboardCopy,
  TrendingUp,
  TrendingDown,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Layers,
  PieChart,
  Baseline,
  Help: LifeBuoy,
  Info,
  Bot,
  Receipt,
  LineChart,
  Check,
  ArrowLeft,
  Back: ArrowLeft,
  Calendar,
  Camera,
  GripVertical,
  // Category Icons
  ShoppingBag,
  Food: UtensilsCrossed,
  Health: Heart,
  Bus,
  Plane,
  Car,
  Electricity: Zap,
  Water: Droplets,
  Wifi,
  Phone: Smartphone,
  Movie: Film,
  Games: Gamepad2,
  Music,
  TV: Tv,
  Ticket,
  Clothing: Shirt,
  Electronics: Laptop,
  HeartPulse,
  Education: University,
  Gift,
  Hotel,
  // New Icons
  Flame,
  ShoppingCart,
  Carrot,
  Coffee,
  Pizza,
  Dumbbell,
  BookOpen,
  Pill,
  Stethoscope,
  Scissors,
  Paintbrush,
  Sparkles,
  CookingPot,
  Glasses,
  Watch,
  Globe,
  Briefcase,
  Building,
  Wrench,
  Baby,
  PawPrint,
  GraduationCap,
  Sprout,
  Train,
  Ship,
  Apple,
  Bell,
  BellRing,
  Announcement: Megaphone,
  Google: ({ className }: { className?: string }) => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={cn("h-5 w-5", className)}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
      <path fill="none" d="M0 0h48v48H0z"></path>
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
    <svg
    role="img"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    className={cn("h-5 w-5", className)}
    >
    <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64c11.2 0 21.7-2.9 30.8-7.9L48.4 55.3v36.6h-6.8V41.8h6.8l50.5 75.8C116.4 106.2 128 86.5 128 64c0-35.3-28.7-64-64-64zm22.1 84.6l-7.5-11.3V41.8h7.5v42.8z" />
    </svg>
  ),

  
  ReactLogo: ({ className }: { className?: string }) => (
    <svg role="img" className={cn("h-5 w-5", className)} viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="0" cy="0" r="1" fill="currentColor"></circle><g stroke="currentColor" strokeWidth="1" fill="none"><ellipse rx="10" ry="3.45"></ellipse><ellipse rx="10" ry="3.45" transform="rotate(60)"></ellipse><ellipse rx="10" ry="3.45" transform="rotate(120)"></ellipse></g></svg>
  ),




  TailwindLogo: ({ className }: { className?: string }) => (
    <svg
    role="img"
    viewBox="0 0 54 33"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z"
      fill="currentColor"
    />
    </svg>
  ),


  ShadcnLogo: ({ className }: { className?: string }) => (
    <svg
    role="img"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
  >
    <path
      d="M81.25 49.9996L50 81.2496"
      stroke="currentColor"
      strokeWidth="6.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M75 15.6246L15.625 74.9996"
      stroke="currentColor"
      strokeWidth="6.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    </svg>
  ),



  GenkitLogo: ({ className }: { className?: string }) => (
    <svg
    role="img"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2L4 6.5V15.5L12 20L20 15.5V6.5L12 2ZM18 14.36L12 17.74L6 14.36V7.64L12 4.26L18 7.64V14.36Z"
      fill="currentColor"
    />
    <path
      d="M12 8L13.1 10.9L16 12L13.1 13.1L12 16L10.9 13.1L8 12L10.9 10.9L12 8Z"
      fill="currentColor"
    />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
