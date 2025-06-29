
import { Icons } from "@/components/icons";

export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6">
      <Icons.AppLogo className="h-20 w-20 text-primary animate-spin" style={{ animationDuration: '1.5s' }} />
      <h2 className="text-xl font-semibold text-foreground mt-6">Loading Page...</h2>
    </div>
  );
}
