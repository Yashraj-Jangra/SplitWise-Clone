import type { SiteSettings } from '@/types';

export function renderEmail(
  templateBody: string,
  variables: Record<string, string | number>,
  settings: SiteSettings,
  subject: string
): string {
  // Replace {variable} with its value in the body
  let renderedBody = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    renderedBody = renderedBody.replace(regex, String(value));
  }

  // Convert basic newlines to <br> for HTML
  const htmlBody = renderedBody.replace(/\n/g, '<br/>');

  // Base layout wrapping
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-height: 50px; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.appName}" class="logo" />` : `<h2>${settings.appName}</h2>`}
      </div>
      <div class="content">
        ${htmlBody}
      </div>
      <div class="footer">
        <p>This email was sent from ${settings.appName}. You can manage your notification preferences in your account settings.</p>
      </div>
    </body>
    </html>
  `;
}
