import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { IconName } from "@/components/icons";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";

interface OverviewCardProps {
  title: string;
  value: string | number;
  description?: string;
  iconName: IconName;
  isCurrency?: boolean;
  className?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function OverviewCard({
  title,
  value,
  description,
  iconName,
  isCurrency = false,
  className,
  trend,
  trendValue,
}: OverviewCardProps) {
  const Icon = Icons[iconName];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {isCurrency && CURRENCY_SYMBOL}{value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && trendValue && (
          <p className={`text-xs mt-1 flex items-center ${
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          }`}>
            {trend === "up" ? <Icons.Home className="h-3 w-3 mr-1 rotate-[225deg]" /> : trend === "down" ? <Icons.Home className="h-3 w-3 mr-1 rotate-45" /> : null}
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
