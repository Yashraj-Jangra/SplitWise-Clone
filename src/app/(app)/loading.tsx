
import { Icons } from "@/components/icons";

export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
      <Icons.AppLogo className="h-24 w-24 text-primary animate-orbit" style={{ animationDuration: '2s' }} />
      <h2 className="text-2xl font-semibold text-foreground mt-8">Loading...</h2>
      <p className="text-muted-foreground mt-2">Please wait a moment.</p>
    </div>
  );
}
