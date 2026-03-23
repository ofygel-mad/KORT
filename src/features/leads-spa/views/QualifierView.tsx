import { KanbanBoard } from '../components/board/KanbanBoard';
import type { KanbanColumn } from '../components/board/KanbanBoard';
import type { Lead } from '../api/types';

const COLUMNS: KanbanColumn[] = [
  { stage: 'new', pipeline: 'qualifier', label: 'Новые', tone: 'info' },
  { stage: 'in_progress', pipeline: 'qualifier', label: 'В работе', tone: 'accent' },
  { stage: 'no_answer', pipeline: 'qualifier', label: 'Недозвон', tone: 'warning' },
  { stage: 'thinking', pipeline: 'qualifier', label: 'Думают', tone: 'accent' },
  { stage: 'meeting_set', pipeline: 'qualifier', label: 'Встреча назначена', tone: 'success' },
  { stage: 'junk', pipeline: 'qualifier', label: 'Брак / спам', tone: 'muted' },
];

export function QualifierView({ leads, onOpenDrawer, onOpenHandoff }: { leads: Lead[]; onOpenDrawer: (id: string) => void; onOpenHandoff: (id: string) => void }) {
  return <KanbanBoard columns={COLUMNS} leads={leads.filter(l => l.pipeline === 'qualifier')} onOpenDrawer={onOpenDrawer} onOpenHandoff={onOpenHandoff} />;
}
