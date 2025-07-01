
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "../ui/skeleton";
import { getInitials, getFullName } from "@/lib/utils";

export function UserNav() {
  const router = useRouter();
  const { userProfile, logout, loading } = useAuth();

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!userProfile) {
    return (
        <Button asChild>
            <Link href="/auth/login">Login</Link>
        </Button>
    )
  }

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50 hover:border-primary transition-colors">
            <AvatarImage src={userProfile.avatarUrl} alt={getFullName(userProfile.firstName, userProfile.lastName)} />
            <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
              {getInitials(userProfile.firstName, userProfile.lastName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getFullName(userProfile.firstName, userProfile.lastName)}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userProfile.role === 'admin' && (
           <>
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Link href="/admin/dashboard">
                <Icons.ShieldCheck className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
             <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="text-primary focus:text-primary focus:bg-primary/10">
            <Link href="/dashboard">
              <Icons.Dashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-primary focus:text-primary focus:bg-primary/10">
            <Link href="/settings">
              <Icons.Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <Icons.Logout className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
