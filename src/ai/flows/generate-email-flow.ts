'use server';
/**
 * @fileOverview An AI flow to generate customized transactional emails.
 *
 * - generateEmail - A function that generates email subject and body.
 * - GenerateEmailInput - The input type for the generateEmail function.
 * - GenerateEmailOutput - The return type for the generateEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { User } from '@/types';

const EmailTemplateSchema = z.enum([
    "welcome", 
    "password_reset", 
    "expense_added", 
    "weekly_summary"
]);

export const GenerateEmailInputSchema = z.object({
  template: EmailTemplateSchema,
  user: z.object({
      name: z.string(),
      email: z.string(),
  }),
  // You could add more context here, e.g., expense details
  // context: z.any().optional(), 
});
export type GenerateEmailInput = z.infer<typeof GenerateEmailInputSchema>;

export const GenerateEmailOutputSchema = z.object({
  subject: z.string().describe("The subject line of the email."),
  body: z.string().describe("The full HTML body of the email. It should be visually appealing and well-formatted."),
});
export type GenerateEmailOutput = z.infer<typeof GenerateEmailOutputSchema>;

export async function generateEmail(input: GenerateEmailInput): Promise<GenerateEmailOutput> {
  return emailGeneratorFlow(input);
}

const emailGeneratorPrompt = ai.definePrompt({
  name: 'emailGeneratorPrompt',
  input: { schema: GenerateEmailInputSchema },
  output: { schema: GenerateEmailOutputSchema },
  prompt: `You are an expert email copywriter for a SaaS application called "SettleEase", an app for managing shared expenses.

Your task is to generate a transactional email based on the provided template type and user information.

**App Name:** SettleEase
**User Name:** {{{user.name}}}
**User Email:** {{{user.email}}}

**Email Type to Generate:** "{{template}}"

**Instructions:**
1.  **Subject Line:** Create a clear, concise, and engaging subject line for the email.
2.  **Email Body:** Write the full HTML for the email body.
    *   It must be a complete HTML document, starting with <!DOCTYPE html>.
    *   Use inline CSS for styling to ensure maximum compatibility with email clients.
    *   The design should be clean, modern, and professional. Use a single-column layout.
    *   Address the user by their name, {{{user.name}}}.
    *   The content should perfectly match the requested email type.
    *   For a "Welcome" email, welcome them to SettleEase and briefly explain the value.
    *   For a "Password Reset" email, provide a clear call-to-action button to reset the password (use a placeholder link: #).
    *   For an "Expense Added" email, you can use placeholder text like "[Expense Description]" and "[Amount]".
    *   For a "Weekly Summary" email, generate a mock summary of recent activity.
    *   Include a simple header with the SettleEase logo and a footer with contact information.

Generate the subject and HTML body based on these instructions.`,
});

const emailGeneratorFlow = ai.defineFlow(
  {
    name: 'emailGeneratorFlow',
    inputSchema: GenerateEmailInputSchema,
    outputSchema: GenerateEmailOutputSchema,
  },
  async (input) => {
    const { output } = await emailGeneratorPrompt(input);
    if (!output) {
        throw new Error("Failed to generate email content.");
    }
    return output;
  }
);
