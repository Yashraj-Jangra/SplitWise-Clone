
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const uidReplaceSchema = z.object({
  oldUid: z.string().min(28, { message: "Please enter a valid Firebase UID." }),
  newUid: z.string().min(28, { message: "Please enter a valid Firebase UID." }),
}).refine(data => data.oldUid !== data.newUid, {
  message: "Old and New UIDs cannot be the same.",
  path: ["newUid"],
});

type UidReplaceFormValues = z.infer<typeof uidReplaceSchema>;

interface ApiResponse {
    success: boolean;
    message: string;
    summary?: string[];
    error?: string;
}

export default function AdminDataToolsPage() {
    const { firebaseUser } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);

    const form = useForm<UidReplaceFormValues>({
        resolver: zodResolver(uidReplaceSchema),
        defaultValues: { oldUid: '', newUid: '' },
    });
    
    const onSubmit = async (values: UidReplaceFormValues) => {
        setIsSubmitting(true);
        setLastResponse(null);
        try {
            if (!firebaseUser) {
                throw new Error("Authentication token not available.");
            }
            const idToken = await firebaseUser.getIdToken();

            const response = await fetch('/api/admin/data-updater', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify(values),
            });

            const result: ApiResponse = await response.json();
            setLastResponse(result);

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred during the update.');
            }

            toast({
                title: "Operation Successful",
                description: result.message,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
            setLastResponse({ success: false, message: 'Operation Failed', error: errorMessage });
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
            setShowConfirmDialog(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold font-headline">Data Management Tools</h1>
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Icons.ShieldCheck className="text-destructive h-5 w-5" />
                            UID Replacement Tool
                        </CardTitle>
                        <CardDescription>
                            This tool finds all instances of an "Old UID" in the database and replaces them with a "New UID". This is a highly destructive operation. Use with extreme caution.
                        </CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={(e) => { e.preventDefault(); setShowConfirmDialog(true); }}>
                            <CardContent className="space-y-4">
                                <Alert variant="destructive">
                                    <Icons.Delete className="h-4 w-4" />
                                    <AlertTitle>Warning!</AlertTitle>
                                    <AlertDescription>
                                        This action will permanently alter your database and delete the user document for the "Old UID". There is no undo. It is strongly recommended to back up your database before proceeding.
                                    </AlertDescription>
                                </Alert>
                                <FormField
                                    control={form.control}
                                    name="oldUid"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Old User ID (to be replaced)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter the UID to search for..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newUid"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New User ID (the replacement)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter the UID to replace with..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                            <CardFooter>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={!form.formState.isValid || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Icons.AppLogo className="mr-2 animate-spin" />Processing...</>
                                    ) : (
                                        'Initiate UID Replacement'
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
                
                {lastResponse && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Last Operation Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {lastResponse.success ? (
                                <Alert variant="default" className="border-green-500 text-green-400">
                                    <Icons.ShieldCheck className="h-4 w-4" />
                                    <AlertTitle>Success</AlertTitle>
                                    <AlertDescription>{lastResponse.message}</AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <Icons.ShieldCheck className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{lastResponse.error}</AlertDescription>
                                </Alert>
                            )}

                             {lastResponse.summary && lastResponse.summary.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Changes Made:</h4>
                                    <ScrollArea className="h-48 rounded-md border p-2 bg-muted/50">
                                        <div className="text-xs font-mono">
                                            {lastResponse.summary.map((item, index) => (
                                                <p key={index}>{item}</p>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to replace all occurrences of UID <strong className="text-primary">{form.getValues("oldUid")}</strong> with UID <strong className="text-primary">{form.getValues("newUid")}</strong> and delete the old user's document.
                            <br /><br />
                            This action is permanent and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} variant="destructive">
                           Confirm and Execute
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
