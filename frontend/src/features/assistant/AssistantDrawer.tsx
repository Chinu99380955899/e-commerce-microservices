import { Dialog } from '../../components/ui/Dialog';
import { ChatPanel } from './ChatPanel';

export interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: string | null;
}

/** The assistant as a drawer: full screen on phones, a side panel on larger screens. */
export default function AssistantDrawer({ open, onOpenChange, prefill }: AssistantDrawerProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer"
      title="Aura"
      description="AuraMart's shopping assistant"
      className="max-w-xl"
    >
      <div className="flex h-full min-h-[70dvh] flex-col">
        <ChatPanel key={prefill ?? 'none'} prefill={prefill} compact />
      </div>
    </Dialog>
  );
}
