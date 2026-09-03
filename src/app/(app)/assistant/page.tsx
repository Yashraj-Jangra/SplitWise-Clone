import { Metadata } from 'next';
import { ChatPanel } from '@/components/ai/chat-panel';

export const metadata: Metadata = {
  title: 'AI Financial Assistant — SplitIt',
  description: 'Grounded question answering for your spending, group balances, and split debts powered by Oracle 23ai and Gemini.',
};

export default function AssistantPage() {
  return (
    <div className="w-full h-[calc(100dvh-4.5rem)] sm:h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto p-2 sm:p-4 md:p-6 flex flex-col">
      <div className="flex-1 w-full rounded-2xl border border-border/30 overflow-hidden shadow-xl bg-background flex flex-col">
        <ChatPanel className="flex-1" />
      </div>
    </div>
  );
}
