
import { Icons } from "@/components/icons";

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-6">
      <div className="relative flex flex-col items-center justify-center space-y-6">
        {/* Animated Rings */}
        <div className="absolute h-48 w-48 rounded-full border-2 border-primary/20 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute h-64 w-64 rounded-full border-t-2 border-b-2 border-primary/50 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
        
        {/* Logo */}
        <div className="relative z-10 animate-pulse" style={{ animationDuration: '2s' }}>
          <Icons.AppLogo className="h-24 w-24 text-primary" />
        </div>
        
        {/* Text */}
        <div className="z-10 text-center">
            <h2 className="text-2xl font-bold tracking-wider text-primary/90">
              Initializing...
            </h2>
            <p className="text-muted-foreground mt-1">
              Calibrating the quantum fields.
            </p>
        </div>
      </div>
    </div>
  );
}
