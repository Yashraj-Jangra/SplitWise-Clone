# Current Working State

## What work has been done (Recent Session)
* Checked out to `dev` branch to keep progress unified.
* Reverted Expense Record action buttons back to explicit Edit/Delete buttons (removed the inconsistent dropdown).
* Restored standard green and red text coloring (`text-green-500` and `text-red-500`) for positive and negative balances across dashboard, group lists, and animations.
* Fixed "Advanced Split" button hover color to be neutral (changed from `ghost` to `secondary` variant to avoid destructive accent).
* Refined Drawer fields in `expense-form.tsx` for Date and Category on mobile, adding proper padding, `DrawerHeader`, and `DrawerTitle`.
* Prevented the login form container from stretching when initiating Google login by replacing `AppLoading` with an inline loader.
* Rewrote the `GroupDetailLoading` skeleton in `groups/[groupId]/loading.tsx` to exactly match the new Tabs-based layout (removing the outdated sidebar structure).

## What's planned next
* Review backend integration patterns when transitioning off mock data.
* Investigate animation performance on lower-end mobile devices.
* Plan and build the notifications system.
