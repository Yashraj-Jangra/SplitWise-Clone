
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { User } from '@/types';
import { getAllUsers } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { generateEmailContent, emailTypes, EmailTemplate } from '@/lib/email-templates';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';

interface EmailOutput {
    subject: string;
    body: string;
}

const emailFormSchema = z.object({
  template: z.enum(emailTypes.map(t => t.value) as [EmailTemplate, ...EmailTemplate[]]),
  userId: z.string().min(1, 'Please select a user.'),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export default function ManageEmailsPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState<EmailOutput | null>(null);

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            template: 'welcome',
            userId: '',
        },
    });

    useEffect(() => {
        async function fetchUsers() {
            setLoadingUsers(true);
            const userList = await getAllUsers();
            setUsers(userList);
            setLoadingUsers(false);
        }
        fetchUsers();
    }, []);

    function onGenerate(values: EmailFormValues) {
        setPreview(null);
        const selectedUser = users.find(u => u.id === values.userId);
        if (!selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the selected user.' });
            return;
        }

        const result = generateEmailContent({
            template: values.template,
            user: { name: selectedUser.name, email: selectedUser.email },
        });

        setPreview(result);
        toast({ title: 'Preview Generated', description: 'Email content is ready for review.' });
    }

    async function onSend() {
        if (!preview) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please generate a preview first.' });
            return;
        }
        setSending(true);

        // --- !!! ---
        // In a real application, this is where you would use the Gmail API or a service like Nodemailer.
        // This is a complex process and requires a secure place to store tokens.
        // For this demo, we will just log the email to the console.
        // --- !!! ---

        console.log("--- SIMULATING EMAIL SEND ---");
        const recipient = users.find(u => u.id === form.getValues('userId'));
        console.log("To:", recipient ? recipient.email : 'N/A');
        console.log("Subject:", preview.subject);
        console.log("Body (HTML):", preview.body);
        console.log("--- END SIMULATION ---");

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

        toast({ title: 'Email "Sent"', description: 'Check the browser console to see the email content.' });
        setSending(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline text-foreground">Manage Emails</h1>
                <p className="text-muted-foreground">Customize and send transactional emails to users.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Email Generator</CardTitle>
                        <CardDescription>Select an email type and user to generate a preview.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="template"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {emailTypes.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Recipient User</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingUsers}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {loadingUsers ? <SelectItem value="loading" disabled>Loading users...</SelectItem> :
                                                        users.map(user => (
                                                            <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={loadingUsers}>
                                    Generate Preview
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Email Preview</CardTitle>
                        <CardDescription>This is how the email will look in the user's inbox.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!preview && (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-10 border-2 border-dashed rounded-lg h-full">
                                <Icons.Mail className="h-16 w-16 mb-4" />
                                <p className="font-semibold">No Preview Available</p>
                                <p className="text-sm">Generate a preview to see it here.</p>
                            </div>
                        )}
                        {preview && (
                            <div className="space-y-4">
                                <div>
                                    <Label>Subject</Label>
                                    <p className="font-semibold p-2 border rounded-md bg-muted/50">{preview.subject}</p>
                                </div>
                                <Separator />
                                <div>
                                    <Label>Body</Label>
                                    <div className="w-full h-[400px] border rounded-md overflow-hidden">
                                        <iframe
                                            srcDoc={preview.body}
                                            className="w-full h-full"
                                            sandbox="" // sandbox for security
                                            title="Email Preview"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full" onClick={onSend} disabled={sending}>
                                    {sending && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                                    {sending ? 'Sending...' : 'Send Email'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
