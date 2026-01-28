
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { deleteNotification, getAllNotifications } from "@/lib/mock-data";
import { format, formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function NotificationActions({ notification, onActionComplete }: { notification: Notification, onActionComplete: () => void }) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteNotification(notification.id);
            toast({ title: "Broadcast Deleted", description: `The notification "${notification.title}" has been deleted.` });
            onActionComplete();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the notification.' });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                <Icons.Delete className="h-4 w-4" />
                <span className="sr-only">Delete Notification</span>
            </Button>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the broadcast titled "{notification.title}". This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
                           {isDeleting && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, delete broadcast
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}


export default function BroadcastHistoryPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        const notificationList = await getAllNotifications();
        setNotifications(notificationList);
        setLoading(false);
    }, []);
    
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-foreground">Broadcast History</h1>
                    <p className="text-muted-foreground">A log of all past announcements and alerts.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/broadcasts">
                        <Icons.Add className="mr-2" /> New Broadcast
                    </Link>
                </Button>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Broadcasts ({notifications.length})</CardTitle>
                    <CardDescription>A list of all notifications sent to users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[45%]">Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date Sent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notifications.map(notif => (
                                <TableRow key={notif.id}>
                                    <TableCell>
                                        <p className="font-medium truncate">{notif.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={notif.type === 'critical_alert' ? 'destructive' : 'secondary'} className="capitalize">
                                            {notif.type.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</TooltipTrigger>
                                                <TooltipContent>{format(new Date(notif.createdAt), 'PPP p')}</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <NotificationActions notification={notif} onActionComplete={fetchNotifications} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {notifications.length === 0 && (
                        <div className="text-center p-12 text-muted-foreground">
                            <Icons.Mail className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg">No broadcasts sent yet.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
        </div>
    )
}
