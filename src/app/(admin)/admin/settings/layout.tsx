export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Admin Site Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global application configuration, authentication wallpapers, email services, and theme customization.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">{children}</div>
    </div>
  );
}
