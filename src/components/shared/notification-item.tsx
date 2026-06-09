import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { NotificationV2 } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFullName, getInitials } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationV2;
  onClick?: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  let Icon = Icons.Bell;
  let iconColor = 'text-primary';
  let bgColor = 'bg-primary/10';

  switch (notification.type) {
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
      Icon = Icons.Expense;
      iconColor = 'text-blue-500';
      bgColor = 'bg-blue-500/10';
      break;
    case 'settlement_added':
      Icon = Icons.Settle;
      iconColor = 'text-green-500';
      bgColor = 'bg-green-500/10';
      break;
    case 'member_added':
    case 'member_removed':
      Icon = Icons.Users;
      iconColor = 'text-orange-500';
      bgColor = 'bg-orange-500/10';
      break;
    case 'broadcast_critical':
      Icon = Icons.ShieldCheck;
      iconColor = 'text-destructive';
      bgColor = 'bg-destructive/10';
      break;
    case 'broadcast_announcement':
      Icon = Icons.Announcement;
      iconColor = 'text-purple-500';
      bgColor = 'bg-purple-500/10';
      break;
    case 'balance_reminder':
      Icon = Icons.Wallet;
      iconColor = 'text-yellow-500';
      bgColor = 'bg-yellow-500/10';
      break;
    case 'support_reply':
      Icon = Icons.Help;
      iconColor = 'text-cyan-500';
      bgColor = 'bg-cyan-500/10';
      break;
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 p-4 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/50",
        !notification.isRead && "bg-muted/20"
      )}
    >
      {notification.actor ? (
         <Avatar className="h-10 w-10 flex-shrink-0">
             <AvatarImage src={notification.actor.avatarUrl} alt={getFullName(notification.actor.firstName, notification.actor.lastName)} />
             <AvatarFallback>{getInitials(notification.actor.firstName, notification.actor.lastName)}</AvatarFallback>
         </Avatar>
      ) : (
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", bgColor)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm text-foreground", !notification.isRead && "font-semibold")}>
            {notification.title}
        </p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mt-1">
            {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      )}
    </div>
  );
}
