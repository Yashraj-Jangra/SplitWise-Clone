
'use client';

import { useState, useEffect } from 'react';
import type { SiteSettings } from '@/types';
import { getSiteSettings, getAllUsers, getAllGroups, getAllExpenses } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { OverviewCard } from '@/components/dashboard/overview-card';
import Link from 'next/link';

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
            {/* Owner section */}
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

export default function AboutPage() {
    const [data, setData] = useState<AboutPageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [settings, users, groups, expenses] = await Promise.all([
                    getSiteSettings(),
                    getAllUsers(),
                    getAllGroups(),
                    getAllExpenses()
                ]);
                setData({
                    settings,
                    stats: {
                        users: users.length,
                        groups: groups.length,
                        expenses: expenses.length,
                    }
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

    return (
        <Card className="p-6 sm:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline mb-2 text-foreground">{about.title}</h1>
                <p className="text-xl text-muted-foreground">{about.subtitle}</p>
            </div>

            <div className="prose prose-invert max-w-none text-muted-foreground mb-12 text-center">
                <p>{about.mainContent}</p>
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

                {/* Meet the Creator */}
                <div className="space-y-4 pt-6 border-t">
                     <h2 className="text-2xl font-bold font-headline text-foreground text-center">Meet the Creator</h2>
                     <div className="flex flex-col md:flex-row items-center gap-6 bg-card/50 p-6 rounded-lg">
                        <Avatar className="h-24 w-24">
                           <AvatarImage src={`https://github.com/${about.githubUrl?.split('/').pop()}.png`} alt={about.ownerName} />
                           <AvatarFallback className="text-3xl">YJ</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-semibold">{about.ownerName}</h3>
                            <p className="text-primary">{about.ownerTitle}</p>
                            <p className="text-muted-foreground mt-2">{about.ownerBio}</p>
                            <div className="flex justify-center md:justify-start gap-2 mt-4">
                                {about.githubUrl && <Button variant="ghost" size="icon" asChild><Link href={about.githubUrl} target="_blank" rel="noopener noreferrer"><Icons.Github className="h-5 w-5" /></Link></Button>}
                                {about.linkedinUrl && <Button variant="ghost" size="icon" asChild><Link href={about.linkedinUrl} target="_blank" rel="noopener noreferrer"><Icons.Linkedin className="h-5 w-5" /></Link></Button>}
                                {about.portfolioUrl && <Button variant="ghost" size="icon" asChild><Link href={about.portfolioUrl} target="_blank" rel="noopener noreferrer"><Icons.Link className="h-5 w-5" /></Link></Button>}
                            </div>
                        </div>
                     </div>
                </div>

                {/* Tech Stack */}
                <div className="space-y-4 pt-6 border-t">
                     <h2 className="text-2xl font-bold font-headline text-foreground text-center">Technology Stack</h2>
                     <p className="text-muted-foreground text-center">
                        This project is proudly built with modern technologies, including a special development environment.
                     </p>
                     <div className="flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border">
                            <Icons.Logo className="h-5 w-5 text-primary"/>
                            <span className="font-medium">Firebase Studio</span>
                        </div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">Next.js</span></div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">React</span></div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">Firebase</span></div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">Tailwind CSS</span></div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">ShadCN UI</span></div>
                        <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-card/50 border"><span className="font-medium">Genkit</span></div>
                     </div>
                </div>
            </div>
        </Card>
    );
}
