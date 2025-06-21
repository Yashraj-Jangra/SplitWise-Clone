import type { User } from '@/types';

export const emailTypes = [
    { value: 'welcome', label: 'Welcome Email' },
    { value: 'password_reset', label: 'Password Reset' },
    { value: 'expense_added', label: 'New Expense Notification' },
    { value: 'weekly_summary', label: 'Weekly Activity Summary' },
] as const;

export type EmailTemplate = typeof emailTypes[number]['value'];

interface GenerateEmailInput {
    template: EmailTemplate;
    user: {
        name: string;
        email: string;
    };
    context?: any; // For future data like expense details
}

interface GenerateEmailOutput {
    subject: string;
    body: string;
}

const generateHtmlShell = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f7; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #75A9FF; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .content p { margin: 0 0 15px; }
        .button { display: inline-block; background-color: #FF9F4A; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; }
        .footer { background-color: #f8f9fa; color: #888; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>SettleEase</h1></div>
        <div class="content">${content}</div>
        <div class="footer"><p>&copy; ${new Date().getFullYear()} SettleEase. All rights reserved.</p></div>
    </div>
</body>
</html>
`;


export function generateEmailContent(input: GenerateEmailInput): GenerateEmailOutput {
    const { template, user, context } = input;
    let subject = '';
    let content = '';

    switch (template) {
        case 'welcome':
            subject = `Welcome to SettleEase, ${user.name}!`;
            content = `
                <p>Hi ${user.name},</p>
                <p>Welcome to SettleEase! We're thrilled to have you on board. Our app makes it simple to track, split, and settle shared expenses with friends and family.</p>
                <p>To get started, you can create a new group or join an existing one. We hope you enjoy the hassle-free way of managing your finances.</p>
                <p>Best,<br>The SettleEase Team</p>
            `;
            break;

        case 'password_reset':
            subject = 'Reset Your SettleEase Password';
            content = `
                <p>Hi ${user.name},</p>
                <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                <p>To reset your password, click the button below:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="#" class="button">Reset Password</a>
                </p>
                <p>This link will expire in 1 hour.</p>
            `;
            break;

        case 'expense_added':
            subject = `New expense added in your group`;
            content = `
                <p>Hi ${user.name},</p>
                <p>A new expense has been added to one of your groups.</p>
                <p><strong>Expense:</strong> ${context?.expenseName || '[Expense Description]'}</p>
                <p><strong>Amount:</strong> ${context?.amount || '[Amount]'}</p>
                <p>You can view the details by logging into your SettleEase account.</p>
            `;
            break;
            
        case 'weekly_summary':
            subject = 'Your Weekly SettleEase Summary';
            content = `
                <p>Hi ${user.name},</p>
                <p>Here's a quick summary of your activity on SettleEase this week:</p>
                <ul>
                    <li><strong>New Expenses Added:</strong> 3</li>
                    <li><strong>Total You Paid:</strong> ₹1500.00</li>
                    <li><strong>Settlements Made:</strong> 1</li>
                </ul>
                <p>Log in to see your full breakdown and settle any outstanding balances!</p>
            `;
            break;

        default:
            subject = 'Notification from SettleEase';
            content = `<p>This is a default notification for ${user.name}.</p>`;
    }
    
    const body = generateHtmlShell(content, subject);
    
    return { subject, body };
}
