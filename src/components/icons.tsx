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
  Mail
} from 'lucide-react';

export const Icons = {
  Users,
  Dashboard: LayoutGrid,
  Add: PlusCircle,
  Currency: IndianRupee,
  Settle: ArrowRightLeft,
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
  Logo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
  ),
  ShieldCheck,
  Wallet,
  Landmark,
  AppLogo: GanttChartSquare,
  Mail,
};

export type IconName = keyof typeof Icons;
