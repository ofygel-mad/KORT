import { KanbanBoard } from '../components/board/KanbanBoard';
import type { KanbanColumn } from '../components/board/KanbanBoard';
import type { Lead } from '../api/types';

const COLUMNS: KanbanColumn[] = [
  { stage: 'awaiting_meeting', pipeline: 'closer', label: 'Ожидает встречи', tone: 'info' },
  { stage: 'meeting_done', pipeline: 'closer', label: 'Встреча проведена', tone: 'accent' },
  { stage: 'proposal', pipeline: 'closer', label: 'Подготовка КП', tone: 'warning' },
  { stage: 'contract', pipeline: 'closer', label: 'Договор и счета', tone: 'accent' },
  { stage: 'awaiting_payment', pipeline: 'closer', label: 'Ожидание оплаты', tone: 'warning' },
  { stage: 'won', pipeline: 'closer', label: 'Успешно', tone: 'success' },
  { stage: 'lost', pipeline: 'closer', label: 'Слив на встрече', tone: 'danger' },
];

export function CloserView({ leads, onOpenDrawer }: { leads: Lead[]; onOpenDrawer: (id: string) => void }) {
  return <KanbanBoard columns={COLUMNS} leads={leads.filter(l => l.pipeline === 'closer')} onOpenDrawer={onOpenDrawer} onOpenHandoff={() => {}} />;
}
