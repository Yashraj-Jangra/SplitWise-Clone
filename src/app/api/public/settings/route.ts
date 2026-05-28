
import { NextResponse } from 'next/server';
import { getSiteSettingsAdmin } from '@/lib/firebase-admin';

/**
 * GET /api/public/settings
 *
 * Returns a safe, stripped subset of SiteSettings for use by:
 *   - The landing page (unauthenticated)
 *   - Auth pages (login, signup, forgot-password)
 *   - The 404 page
 *
 * NEVER includes: SMTP credentials, Gmail OAuth tokens, email templates,
 * or any other sensitive configuration.
 *
 * Cached at the CDN edge for 5 minutes to minimize Firestore reads.
 */
export async function GET() {
    try {
        const settings = await getSiteSettingsAdmin();

        // Build a safe public payload — only branding, themes, and content fields
        const publicSettings = {
            appName: settings.appName,
            logoUrl: settings.logoUrl,
            faviconUrl: settings.faviconUrl,
            coverImages: settings.coverImages,
            landingImages: settings.landingImages,
            defaultThemeId: settings.defaultThemeId,
            userSelectableThemeIds: settings.userSelectableThemeIds,
            customThemes: settings.customThemes,
            landingPage: settings.landingPage,
            authPage: settings.authPage,
            about: settings.about,
            privacyPolicy: settings.privacyPolicy,
            termsAndConditions: settings.termsAndConditions,
            notFoundPage: settings.notFoundPage,
            maintenanceMode: settings.maintenanceMode
                ? {
                    enabled: settings.maintenanceMode.enabled,
                    title: settings.maintenanceMode.title,
                    message: settings.maintenanceMode.message,
                    imageUrl: settings.maintenanceMode.imageUrl,
                }
                : undefined,
            // Explicitly excluded: emailSettings, stats, emailTemplates
        };

        return NextResponse.json(publicSettings, {
            headers: {
                // Cache at CDN for 5 minutes, revalidate in background
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('API Error - /api/public/settings:', error);
        return NextResponse.json(
            { error: 'Failed to load settings' },
            { status: 500 }
        );
    }
}
