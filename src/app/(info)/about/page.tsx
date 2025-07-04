

'use client';

import { useState, useEffect } from 'react';
import type { SiteSettings } from '@/types';
import { getSiteSettings } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { OverviewCard } from '@/components/dashboard/overview-card';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AboutPageData {
    settings: SiteSettings;
    stats: {
        users: number;
        groups: number;
        expenses: number;
    }
}

function AboutPageSkeleton() {
    return (
        <Card className="p-6 sm:p-8 space-y-8">
            <div className="text-center mb-4">
                <Skeleton className="h-10 w-3/4 mx-auto mb-3" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
            </div>
            <Skeleton className="h-20 w-full" />
            {/* Stats section */}
            <div className="space-y-4 pt-6 border-t">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
            {/* Team section */}
             <div className="space-y-4 pt-6 border-t">
                <Skeleton className="h-8 w-1/3" />
                 <div className="flex flex-col md:flex-row items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                 </div>
            </div>
        </Card>
    )
}

const technologies = [
  { name: 'Firebase Studio', icon: Icons.Logo, color: 'text-primary' },
  { name: 'Next.js', icon: Icons.NextJs, color: 'text-foreground' },
  { name: 'React', icon: Icons.ReactLogo, color: 'text-sky-400' },
  { name: 'Firebase', icon: Icons.FirebaseLogo, color: 'text-amber-500' },
  { name: 'Tailwind CSS', icon: Icons.TailwindLogo, color: 'text-cyan-400' },
  { name: 'ShadCN UI', icon: Icons.ShadcnLogo, color: 'text-foreground' },
  { name: 'Genkit', icon: Icons.GenkitLogo, color: 'text-emerald-400' },
];


export default function AboutPage() {
    const [data, setData] = useState<AboutPageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const settings = await getSiteSettings();
                setData({
                    settings,
                    stats: settings.stats || { users: 0, groups: 0, expenses: 0 }
                });
            } catch (error) {
                console.error("Failed to load About page data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !data) {
        return <AboutPageSkeleton />;
    }

    const { settings, stats } = data;
    const about = settings.about!;

    const replaceAppName = (text: string) => text.replace(/{appName}/g, settings.appName);

    return (
        <Card className="p-6 sm:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline mb-2 text-foreground">{replaceAppName(about.title)}</h1>
                <p className="text-xl text-muted-foreground">{replaceAppName(about.subtitle)}</p>
            </div>

            <div className="prose prose-invert max-w-none text-muted-foreground mb-12 text-center">
                <p>{replaceAppName(about.mainContent)}</p>
            </div>

            <div className="space-y-12">
                {/* Statistics */}
                <div className="space-y-4 pt-6 border-t">
                    <h2 className="text-2xl font-bold font-headline text-foreground text-center">Key Statistics</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <OverviewCard title="Total Users" value={stats.users} iconName="Users" />
                        <OverviewCard title="Total Groups" value={stats.groups} iconName="Details" />
                        <OverviewCard title="Total Expenses" value={stats.expenses} iconName="Expense" />
                    </div>
                </div>

                {/* Meet the Team */}
                <div className="space-y-6 pt-6 border-t">
                     <h2 className="text-2xl font-bold font-headline text-foreground text-center">Meet the Team</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {about.team.map(member => (
                            <div key={member.id} className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6 bg-card/50 p-6 rounded-lg">
                                <Avatar className="h-24 w-24 flex-shrink-0">
                                <AvatarImage src={member.avatarUrl || `https://github.com/${member.githubUrl?.split('/').pop()}.png`} alt={member.name} />
                                <AvatarFallback className="text-3xl">{getInitials(member.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold">{member.name}</h3>
                                    <p className="text-primary">{member.title}</p>
                                    <p className="text-muted-foreground mt-2 text-sm">{member.bio}</p>
                                    <div className="flex justify-center sm:justify-start gap-2 mt-4">
                                        {member.githubUrl && <Button variant="ghost" size="icon" asChild><Link href={member.githubUrl} target="_blank" rel="noopener noreferrer"><Icons.Github className="h-5 w-5" /></Link></Button>}
                                        {member.linkedinUrl && <Button variant="ghost" size="icon" asChild><Link href={member.linkedinUrl} target="_blank" rel="noopener noreferrer"><Icons.Linkedin className="h-5 w-5" /></Link></Button>}
                                        {member.portfolioUrl && <Button variant="ghost" size="icon" asChild><Link href={member.portfolioUrl} target="_blank" rel="noopener noreferrer"><Icons.Link className="h-5 w-5" /></Link></Button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>

                {/* Tech Stack */}
                <div className="space-y-4 pt-6 border-t">
                     <h2 className="text-2xl font-bold font-headline text-foreground text-center">Technology Stack</h2>
                     <p className="text-muted-foreground text-center">
                        This project is proudly built with modern technologies, including a special development environment.
                     </p>
                     <div className="flex flex-wrap gap-4 justify-center pt-4">
                        {technologies.map((tech) => (
                             <div key={tech.name} className="flex items-center gap-3 py-2 px-4 rounded-lg bg-card/50 border hover:bg-muted transition-colors">
                                <tech.icon className={cn("h-6 w-6", tech.color)} />
                                <span className="font-medium text-foreground">{tech.name}</span>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        </Card>
    );
}
