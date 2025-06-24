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
    <Card className="w-full shadow-2xl bg-card/60 backdrop-blur-lg border-border/20">
      <CardHeader className="text-center">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}
        <CardTitle className="text-2xl font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
