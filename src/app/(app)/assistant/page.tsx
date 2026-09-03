import { Metadata } from 'next';
import { ChatPanel } from '@/components/ai/chat-panel';

export const metadata: Metadata = {
  title: 'AI Financial Assistant — SplitIt',
  description: 'Ask questions about your spending, group balances, and debts powered by Oracle 23ai and Gemini.',
};

export default function AssistantPage() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] max-w-4xl mx-auto p-2 sm:p-4 md:p-6 flex flex-col">
      <div className="flex-1 w-full rounded-2xl border border-border/70 overflow-hidden shadow-sm bg-card flex flex-col">
        <ChatPanel className="flex-1" />
      </div>
    </div>
  );
}
