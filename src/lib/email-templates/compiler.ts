import type { SiteSettings } from '@/types';

/**
 * Renders a variable string (subject or body snippet) by replacing {var} tokens.
 */
function renderVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}

/**
 * Renders a complete, production-quality HTML email from a template body string.
 * Uses an inline-CSS, table-based layout for maximum email client compatibility.
 */
export function renderEmail(
  templateBody: string,
  variables: Record<string, string | number>,
  settings: SiteSettings,
  subject: string
): string {
  const renderedBody = renderVariables(templateBody, variables);
  const renderedSubject = renderVariables(subject, variables);
  const appName = settings.appName || 'SplitIt';
  const logoUrl = settings.logoUrl || '';

  // Convert newlines to HTML paragraphs
  const paragraphs = renderedBody
    .split(/\n\n+/)
    .map(para => {
      const lines = para.replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.75;">${lines}</p>`;
    })
    .join('');

  // Extract any CTA button links (format: [Button Text](url))
  const bodyWithButtons = paragraphs.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    `<a href="$2" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.3px;margin:8px 0;">$1</a>`
  );

  const headerSection = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" style="max-height:44px;max-width:160px;object-fit:contain;">`
    : `<span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${appName}</span>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>${renderedSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td><![endif]-->

  <!-- Preheader (hidden inbox preview text) -->
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${renderedSubject} — ${appName}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email card (max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);padding:36px 40px 32px;border-radius:16px 16px 0 0;">
              <!-- Accent bar -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <div style="width:48px;height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);border-radius:2px;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    ${headerSection}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ CONTENT BODY ═══ -->
          <tr>
            <td style="background:#ffffff;padding:40px 44px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${bodyWithButtons}
            </td>
          </tr>

          <!-- ═══ DIVIDER ═══ -->
          <tr>
            <td style="background:#ffffff;padding:0 44px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);"></div>
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td align="center" style="background:#f8fafc;padding:24px 44px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This email was sent by <strong style="color:#64748b;">${appName}</strong>. You can manage your notification preferences in your
                <a href="#" style="color:#6366f1;text-decoration:none;">account settings</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

  <!--[if mso | IE]></td></tr></table><![endif]-->

</body>
</html>`;
}

/**
 * Convenience wrapper: renders just the subject line variables.
 */
export function renderSubject(
  subjectTemplate: string,
  variables: Record<string, string | number>
): string {
  return renderVariables(subjectTemplate, variables);
}
