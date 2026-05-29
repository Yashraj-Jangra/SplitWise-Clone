import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function GroupDetailLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Group Detail Header Skeleton */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="relative h-32 md:h-40 w-full bg-muted/50">
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="flex flex-row justify-between items-end gap-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48 md:w-64 bg-black/20" />
                <Skeleton className="h-4 w-32 bg-black/20" />
              </div>
              <div className="flex-shrink-0 flex gap-0">
                 <Skeleton className="h-10 w-28 rounded-r-none" />
                 <Skeleton className="h-10 w-24 rounded-l-none" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Compact Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-border/50 bg-background/50">
          <div className="p-3 flex flex-col items-center justify-center space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
          </div>
          <div className="p-3 flex flex-col items-center justify-center space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8" />
          </div>
          <div className="p-3 flex flex-col items-center justify-center space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="w-full">
        <div className="grid w-full grid-cols-6 md:w-auto md:inline-flex md:justify-start gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-full md:w-28 rounded-md" />
          ))}
        </div>

        {/* Tab Content Skeleton (Activity Log) */}
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-32 mb-2" />
             <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
                  <div className="flex items-center gap-4">
                     <Skeleton className="h-10 w-10 rounded-md" />
                     <div className="space-y-2">
                       <Skeleton className="h-5 w-32" />
                       <Skeleton className="h-4 w-48" />
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <Skeleton className="h-5 w-20" />
                     <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
