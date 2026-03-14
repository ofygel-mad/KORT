import { KanbanBoard } from '../components/board/KanbanBoard';
import type { KanbanColumn } from '../components/board/KanbanBoard';
import type { Lead } from '../api/types';

const COLUMNS: KanbanColumn[] = [
  { stage:'awaiting_meeting',  pipeline:'closer', label:'Ожидает встречи',  accent:'#3b82f6' },
  { stage:'meeting_done',      pipeline:'closer', label:'Встреча проведена',accent:'#8b5cf6' },
  { stage:'proposal',          pipeline:'closer', label:'Подготовка КП',    accent:'#f59e0b' },
  { stage:'contract',          pipeline:'closer', label:'Договор и счета',  accent:'#ec4899' },
  { stage:'awaiting_payment',  pipeline:'closer', label:'Ожидание оплаты', accent:'#f97316' },
  { stage:'won',               pipeline:'closer', label:'Успешно',          accent:'#22c55e' },
  { stage:'lost',              pipeline:'closer', label:'Слив на встрече',  accent:'#6b7280' },
];

export function CloserView({ leads, onOpenDrawer }: { leads: Lead[]; onOpenDrawer: (id: string) => void }) {
  return <KanbanBoard columns={COLUMNS} leads={leads.filter(l => l.pipeline === 'closer')} onOpenDrawer={onOpenDrawer} onOpenHandoff={() => {}} />;
}
