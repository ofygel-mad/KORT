import { KanbanBoard } from '../components/board/KanbanBoard';
import type { KanbanColumn } from '../components/board/KanbanBoard';
import type { Lead } from '../api/types';

const COLUMNS: KanbanColumn[] = [
  { stage:'new',          pipeline:'qualifier', label:'Новые',            accent:'#3b82f6' },
  { stage:'in_progress',  pipeline:'qualifier', label:'В работе',         accent:'#8b5cf6' },
  { stage:'no_answer',    pipeline:'qualifier', label:'Недозвон',         accent:'#f59e0b' },
  { stage:'thinking',     pipeline:'qualifier', label:'Думают',           accent:'#ec4899' },
  { stage:'meeting_set',  pipeline:'qualifier', label:'Встреча назначена',accent:'#22c55e' },
  { stage:'junk',         pipeline:'qualifier', label:'Брак / Спам',      accent:'#6b7280' },
];

export function QualifierView({ leads }: { leads: Lead[] }) {
  return <KanbanBoard columns={COLUMNS} leads={leads.filter(l => l.pipeline === 'qualifier')} />;
}
