import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/icons";

export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6">
      <Icons.AppLogo className="h-20 w-20 text-primary animate-pulse mb-8" />
      <h2 className="text-2xl font-semibold text-foreground mb-4">Loading SettleEase...</h2>
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    