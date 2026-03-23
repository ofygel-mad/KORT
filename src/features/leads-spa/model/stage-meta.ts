import type { LeadStage } from '../api/types';

export type LeadTone = 'accent' | 'info' | 'warning' | 'success' | 'danger' | 'muted';

interface LeadStageMeta {
  label: string;
  shortLabel: string;
  tone: LeadTone;
}

export const LEAD_STAGE_META: Record<LeadStage, LeadStageMeta> = {
  new: { label: 'Новый', shortLabel: 'Новый', tone: 'info' },
  in_progress: { label: 'В работе', shortLabel: 'В работе', tone: 'accent' },
  no_answer: { label: 'Недозвон', shortLabel: 'Недозвон', tone: 'warning' },
  thinking: { label: 'Думает', shortLabel: 'Думает', tone: 'accent' },
  meeting_set: { label: 'Встреча назначена', shortLabel: 'Встреча', tone: 'success' },
  junk: { label: 'Брак / спам', shortLabel: 'Брак', tone: 'muted' },
  awaiting_meeting: { label: 'Ожидает встречи', shortLabel: 'Ожидает', tone: 'info' },
  meeting_done: { label: 'Встреча проведена', shortLabel: 'Встреча', tone: 'accent' },
  proposal: { label: 'Подготовка КП', shortLabel: 'КП', tone: 'warning' },
  contract: { label: 'Договор и счета', shortLabel: 'Договор', tone: 'accent' },
  awaiting_payment: { label: 'Ожидание оплаты', shortLabel: 'Оплата', tone: 'warning' },
  won: { label: 'Успешно', shortLabel: 'Успешно', tone: 'success' },
  lost: { label: 'Слив', shortLabel: 'Слив', tone: 'danger' },
};

export const PIPELINE_META = {
  qualifier: { label: 'Лидогенерация', shortLabel: 'Квалификатор', tone: 'accent' as LeadTone },
  closer: { label: 'Сделки', shortLabel: 'Клоузер', tone: 'success' as LeadTone },
};

export function getLeadStageMeta(stage: LeadStage | string): LeadStageMeta {
  return LEAD_STAGE_META[stage as LeadStage] ?? {
    label: stage,
    shortLabel: stage,
    tone: 'muted',
  };
}
