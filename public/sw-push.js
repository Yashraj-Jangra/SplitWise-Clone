function getNotificationIcon(type) {
  if (!type) return '/icons/favicon.svg';
  if (type.includes('expense')) return '/notif-icons/notif-expense.svg';
  if (type === 'settlement_added') return '/notif-icons/notif-settlement.svg';
  if (type === 'payment_reminder' || type === 'payment_confirmation_request') return '/notif-icons/notif-reminder.svg';
  if (type === 'member_added' || type === 'member_removed') return '/notif-icons/notif-member.svg';
  if (type === 'support_reply') return '/notif-icons/notif-support.svg';
  if (type === 'monthly_summary' || type === 'budget_alert' || type === 'budget_exceeded') return '/notif-icons/notif-summary.svg';
  if (type === 'group_inactivity') return '/notif-icons/notif-inactivity.svg';
  if (type === 'broadcast_critical') return '/notif-icons/notif-critical.svg';
  if (type === 'broadcast_announcement') return '/notif-icons/notif-announcement.svg';
  return '/icons/favicon.svg';
}

self.addEventListener('push', (event) => {
  try {
    const payload = event.data?.json() || {};
    const title = payload.title || 'SplitWise Clone Notification';
    const body = payload.body || '';
    const data = payload.data || {};

    const actions = [];
    if (data.type && data.type.includes('expense')) {
      actions.push({ action: 'view', title: '👁 View Expense' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'budget_alert' || data.type === 'budget_exceeded') {
      actions.push({ action: 'view', title: '📊 View Budget' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'settlement_added') {
      actions.push({ action: 'view', title: '💳 View Settlement' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'payment_reminder') {
      actions.push({ action: 'settle', title: '💰 Settle Now' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'payment_confirmation_request') {
      actions.push({ action: 'view', title: '✅ Confirm' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'support_reply') {
      actions.push({ action: 'view', title: '💬 View Reply' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'monthly_summary') {
      actions.push({ action: 'view', title: '📊 View Report' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type === 'group_inactivity') {
      actions.push({ action: 'view', title: '👥 View Group' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    } else if (data.type && data.type.startsWith('broadcast')) {
      actions.push({ action: 'view', title: '📢 View' });
    } else {
      actions.push({ action: 'view', title: '👁 View' });
      actions.push({ action: 'mark_read', title: '✓ Mark Read' });
    }

    const options = {
      body,
      icon: getNotificationIcon(data.type),
      badge: '/icons/favicon.svg',
      vibrate: [200, 100, 200], // vibration pattern
      actions,
      data: {
        url: data.url || '/',
        markReadUrl: data.markReadUrl || null
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push event in service worker:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';
  const markReadUrl = notificationData.markReadUrl;

  if (event.action === 'mark_read') {
    if (markReadUrl) {
      event.waitUntil(
        fetch(markReadUrl, { method: 'PATCH' })
          .then(res => {
            if (!res.ok) console.warn('Failed background mark read');
          })
          .catch(err => console.error('Error marking read from SW:', err))
      );
    }
    return;
  }

  // Handle standard click or other action clicks by opening/focusing window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // If a window is already open, navigate it or focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
