import { Metadata } from 'next';
import { ChatPanel } from '@/components/ai/chat-panel';

export const metadata: Metadata = {
  title: 'Financial Assistant — SplitIt',
  description: 'Instant answers and spending analysis for your personal expenses, group balances, and split debts.',
};

export default function AssistantPage() {
  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden">
      <ChatPanel variant="full" className="flex-1 h-full" />
    </div>
  );
}
