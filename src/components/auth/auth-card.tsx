
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function AuthCard({ title, description, children, icon }: AuthCardProps) {
  return (
    <Card className="w-full bg-transparent border-0 shadow-none">
      <CardHeader className="text-center">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}
        <CardTitle className="text-3xl font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
