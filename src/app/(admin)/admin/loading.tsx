
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/icons";

export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6">
      <Icons.AppLogo className="h-20 w-20 text-primary animate-pulse mb-8" />
      <h2 className="text-2xl font-semibold text-foreground mb-4">Loading Admin Page...</h2>
      <div className="w-full max-w-xl space-y-4">
        <div className="flex justify-between">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-12 w-1/4" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
