
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
  ArrowRight,
  Analysis: PieChart,
  History,
  Restore: Undo2,
  Google: () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.98-4.66 1.98-3.56 0-6.21-2.76-6.21-6.22s2.65-6.22 6.21-6.22c1.98 0 3.06.83 3.82 1.56l2.6-2.58C18.04 3.82 15.61 2.5 12.48 2.5c-5.48 0-9.88 4.4-9.88 9.88s4.4 9.88 9.88 9.88c2.8 0 4.93-1 6.5-2.62 1.63-1.62 2.1-4.2 2.1-6.62 0-.6-.05-1.16-.16-1.72h-8.28z" fill="currentColor"></path>
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
