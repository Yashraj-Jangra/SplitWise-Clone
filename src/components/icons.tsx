

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

const FirebaseStudioIcon = ({ className }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 43.5 65"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
  >
    <defs>
      <linearGradient
        id="astro-gradient-a"
        x1="5.9"
        x2="27.6"
        y1="28"
        y2="64.5"
        gradientTransform="matrix(1 0 0 -1 0 66)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#f8682f" />
        <stop offset="1" stopColor="#dd2c00" />
      </linearGradient>
      <linearGradient
        id="astro-gradient-b"
        x1="29"
        x2="26.5"
        y1="38.5"
        y2="-5"
        gradientTransform="matrix(1 0 0 -1 0 66)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#f8682f" />
        <stop offset=".6" stopColor="#e92a4e" />
        <stop offset="1" stopColor="#c447ff" />
      </linearGradient>
    </defs>
    <g>
      <path
        d="M31.4 24.3c.4 0 .9.2 1.6.3l6.6 4.3-21.5 12.8c-.3.1-.7.2-1.1.4-.5.1-1.1.2-1.5.3h-1.4l-8.3-9.9 17.3-6.7c1.8-.7 3.3-1 4.5-1.2 1.3-.2 2.5-.4 3.9-.3Z"
        fill="#ffc400"
      />
      <path
        d="M31 7.9c-.1-.6-.3-1.2-.5-1.7-.3-1-1.1-3-3-4.9-.3-.3-.8-.8-1.4-1.2-2.3 2.8-4.4 4.8-5.8 6-3.6 3.3-9.5 7.8-13.3 11.3-.7.6-2 1.9-3.2 4-.2.4-.5.9-.8 1.4 0 0 0 .2-.1.3-.1.3-.2.5-.4.8-.5 1.1-1.1 2.6-1.2 4.5-.2 1.7 0 3 .1 3.6 0 .2 0 .4.1.6.2.7.4 1.4.7 2 1.3 3 3.4 4.7 3.8 5 2.3 1.8 4.6 2.3 5.3 2.5 1 .2 1.9.2 2.6.2-.1-.5-.3-1.2-.4-2-.3-2.9.7-5.1 1.1-6.3.4-.8 1.2-2.8 3.1-4.6.9-.8 1.8-1.5 2.7-2.1 1-.7 1.9-1.2 2.4-1.5 1.8-1.3 5.3-4.3 7.1-9 .2-.6.4-1.1.4-1.1.6-1.8 1.1-4.5.4-7.7Z"
        fill="url(#astro-gradient-a)"
      />
      <path
        d="M14 42.3c-.6 0-1.5 0-2.6-.2-.7-.1-3-.7-5.3-2.5-.5-.4-3.7-3-4.6-7.7-.1-.6-.3-1.9-.1-3.6.2-1.9.8-3.3 1.2-4.5.4-1.1.9-1.9 1.2-2.5.1.4.4 1 .8 1.6.9 1.4 2 2.1 2.8 2.7.4.2 2.1 1.3 4.7 1.9 1.8.4 3.2.4 3.6.4 1.1 0 2.7-.2 4.7-.9 1.1-.4 2-1 2.6-1.3-.5.4-1.4.9-2.5 1.6-.9.6-1.9 1.3-2.7 2.1-1.9 1.8-2.7 3.8-3.1 4.6-.5 1.1-1.4 3.3-1.1 6.3 0 .9.2 1.6.4 2Z"
        fill="#ff9100"
      />
      <path
        d="M42 41.4c.8-1.6 1.1-3.3 1.1-3.3 0-.4.2-1.1.3-1.8 0-.7 0-1.8-.1-2.7-.5-2.9-2.7-5.2-3-5.5 0 0-1.5-1.5-3.7-2.6-.3-.2-.9-.4-1.7-.7-.8-.2-1.4-.3-2-.4-.7 0-1.2-.1-1.6-.2h.4c.4 0 .6.2.8.3.2 0 .5.2.8.5.1.1.3.2.4.4.1.2.3.4.4.8.3 1.1-.4 2.1-.6 2.5-1.7 2.6-11.1 8.1-16.6 13.8-1.4 1.5-2.4 2.8-3.2 4.4-1.7 3.8-1.1 7.4-.9 8.2 1 5.3 4.9 8.2 5.8 8.8 2.7-3 5.1-5.3 6.9-7 4.5-4.1 10.3-8.6 10.3-8.6s4.5-3.6 6.2-7.1Z"
        fill="url(#astro-gradient-b)"
      />
    </g>
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
  PanelRightOpen,
  Layers,
  PieChart,
  Baseline,
  Help: LifeBuoy,
  LineChart,
  Check,
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


  FirebaseLogo: ({ className }: { className?: string }) => (
    <svg
    role="img"
    viewBox="-47.5 0 351 351"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5", className)}
    >
    <path
      d="M0 282.998l2.123-2.972L102.527 89.512l.212-2.017L58.479 4.358C54.77-2.606 44.331-.845 43.114 6.95L0 282.998z"
      fill="#FFC24A"
    />
    <path
      d="M1.253 280.732l1.605-3.131L102.211 89.083 58.061 5.608C54.393-1.283 45.074.474 43.87 8.188L1.253 280.732z"
      fill="#FFA712"
    />
    <path
      d="M135.005 150.381l32.955-33.751-32.965-62.93c-3.129-5.957-11.866-5.974-14.963 0L102.421 87.288v2.86l32.584 60.233z"
      fill="#F4BD62"
    />
    <path
      d="M134.417 148.974l32.039-32.812-32.039-61.007c-3.042-5.791-10.433-6.398-13.444-.59l-17.705 34.11-.529 1.744 31.678 58.555z"
      fill="#FFA50E"
    />
    <path
      d="M0 282.998l.962-.968 3.496-1.42 128.477-128 1.628-4.431-32.05-61.074"
      fill="#F6820C"
    />
    <path
      d="M139.121 347.551L255.396 282.704l-33.204-204.494c-1.039-6.398-8.888-8.928-13.468-4.34L0 282.998l115.608 64.548c7.306 4.079 16.205 4.081 23.513.005z"
      fill="#FDE068"
    />
    <path
      d="M254.354 282.16L221.402 79.218c-1.031-6.35-7.558-8.977-12.103-4.424L1.289 282.601l114.339 63.909c7.25 4.048 16.08 4.05 23.334.005l115.392-64.355z"
      fill="#FCCA3F"
    />
    <path
      d="M139.121 345.641c-7.308 4.075-16.206 4.074-23.513-.006L.931 282.015 0 282.998l115.608 64.548c7.306 4.079 16.205 4.081 23.513.005l116.275-64.848-.285-1.752-115.99 64.689z"
      fill="#EEAB37"
    />
    </svg>
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


  FirebaseStudio: FirebaseStudioIcon,


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
