/**
 * leads-spa/api/mock.ts
 * Mock data + async API shims.
 * Replace each function body with a real fetch() call to connect backend.
 */
import { nanoid } from 'nanoid';
import type { Lead, StaffMember, Notification, LeadStage } from './types';

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

// ─── Seed data ──────────────────────────────────────────────
const SOURCES = ['instagram', 'site', 'referral', 'ad'];
const NAMES = [
  'Айгерим Сейткали','Данияр Аубаков','Мадина Нурланова','Ерлан Жумабеков',
  'Алия Тасбулатова','Нурлан Касымов','Гульнара Бекова','Тимур Смагулов',
];

function makeHistory(stage: LeadStage) {
  return [
    { id: nanoid(), author: 'Система', authorRole: 'general' as const, action: 'Лид создан', timestamp: new Date(Date.now()-86400000).toISOString() },
    ...(stage !== 'new' ? [{ id: nanoid(), author: 'Акбар А.', authorRole: 'qualifier' as const, action: 'Взято в работу', timestamp: new Date(Date.now()-43200000).toISOString() }] : []),
  ];
}

const _leads: Lead[] = [
  { id:'l1', fullName:'Айгерим Сейткали', phone:'+77001112233', source:'instagram', stage:'new', pipeline:'qualifier', createdAt:new Date(Date.now()-3600000).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), history: makeHistory('new') },
  { id:'l2', fullName:'Данияр Аубаков', phone:'+77012223344', source:'site', stage:'in_progress', pipeline:'qualifier', assignedName:'Акбар А.', createdAt:new Date(Date.now()-7200000).toISOString(), updatedAt:new Date(Date.now()-1800000).toISOString(), history: makeHistory('in_progress') },
  { id:'l3', fullName:'Мадина Нурланова', phone:'+77023334455', source:'ad', stage:'thinking', pipeline:'qualifier', callbackAt:new Date(Date.now()+86400000).toISOString(), createdAt:new Date(Date.now()-172800000).toISOString(), updatedAt:new Date(Date.now()-90000000).toISOString(), history: makeHistory('thinking') },
  { id:'l4', fullName:'Ерлан Жумабеков', phone:'+77034445566', source:'referral', stage:'no_answer', pipeline:'qualifier', createdAt:new Date(Date.now()-86400000).toISOString(), updatedAt:new Date(Date.now()-86400000).toISOString(), history: makeHistory('no_answer') },
  { id:'l5', fullName:'Алия Тасбулатова', phone:'+77045556677', source:'site', stage:'meeting_set', pipeline:'qualifier', meetingAt:new Date(Date.now()+172800000).toISOString(), budget:500000, comment:'Интересует квартира 3-комнатная', createdAt:new Date(Date.now()-86400000).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), history: makeHistory('meeting_set') },
  { id:'l6', fullName:'Нурлан Касымов', phone:'+77056667788', source:'instagram', stage:'awaiting_meeting', pipeline:'closer', assignedName:'Сауле М.', meetingAt:new Date(Date.now()+86400000).toISOString(), budget:800000, comment:'Клиент из Астаны, бюджет 800к', createdAt:new Date(Date.now()-172800000).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), history: makeHistory('awaiting_meeting') },
  { id:'l7', fullName:'Гульнара Бекова', phone:'+77067778899', source:'ad', stage:'contract', pipeline:'closer', assignedName:'Сауле М.', budget:1200000, checklistDone:['req'], createdAt:new Date(Date.now()-604800000).toISOString(), updatedAt:new Date(Date.now()-7200000).toISOString(), history: makeHistory('contract') },
  { id:'l8', fullName:'Тимур Смагулов', phone:'+77078889900', source:'referral', stage:'meeting_done', pipeline:'closer', assignedName:'Алибек Н.', budget:650000, createdAt:new Date(Date.now()-259200000).toISOString(), updatedAt:new Date(Date.now()-14400000).toISOString(), history: makeHistory('meeting_done') },
];

const _staff: StaffMember[] = [
  { id:'u1', fullName:'Акбар Аубаков',  email:'akbar@company.kz', role:'qualifier' },
  { id:'u2', fullName:'Сауле Мухамбет', email:'saule@company.kz', role:'closer' },
  { id:'u3', fullName:'Алибек Нуров',   email:'alibek@company.kz', role:'closer' },
  { id:'u4', fullName:'Камила Рахим',   email:'kamila@company.kz', role:'manager' },
];

const _notifications: Notification[] = [
  { id:'n1', type:'meeting_assigned', title:'Встреча назначена', body:'Нурлан Касымов — завтра в 14:00', read:false, createdAt:new Date(Date.now()-1800000).toISOString() },
  { id:'n2', type:'callback_reminder', title:'Перезвонить сегодня', body:'Мадина Нурланова ждёт ответа', read:false, createdAt:new Date(Date.now()-3600000).toISOString() },
  { id:'n3', type:'lead_moved', title:'Лид передан', body:'Алия Тасбулатова — передана на закрытие', read:true, createdAt:new Date(Date.now()-86400000).toISOString() },
];

// ─── API functions ──────────────────────────────────────────
export const leadsApi = {
  getLeads: async (): Promise<Lead[]> => { await delay(); return [..._leads]; },
  updateLeadStage: async (id: string, stage: LeadStage, pipeline: 'qualifier'|'closer'): Promise<Lead> => {
    await delay(80);
    const lead = _leads.find(l => l.id === id)!;
    lead.stage = stage; lead.pipeline = pipeline; lead.updatedAt = new Date().toISOString();
    return { ...lead };
  },
  addHistoryEntry: async (leadId: string, entry: Omit<Lead['history'][0],'id'>): Promise<void> => {
    await delay(60);
    const lead = _leads.find(l => l.id === leadId);
    if (lead) lead.history.push({ id: nanoid(), ...entry });
  },
  updateChecklist: async (leadId: string, itemId: string, done: boolean): Promise<void> => {
    await delay(60);
    const lead = _leads.find(l => l.id === leadId);
    if (!lead) return;
    lead.checklistDone = lead.checklistDone ?? [];
    if (done) { if (!lead.checklistDone.includes(itemId)) lead.checklistDone.push(itemId); }
    else { lead.checklistDone = lead.checklistDone.filter(i => i !== itemId); }
  },
  createLead: async (data: Partial<Lead>): Promise<Lead> => {
    await delay(100);
    const lead: Lead = {
      id: nanoid(), fullName: data.fullName ?? 'Новый лид', phone: data.phone ?? '',
      source: data.source ?? 'site', stage: 'new', pipeline: 'qualifier',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      history: [{ id: nanoid(), author: 'Система', authorRole: 'general', action: 'Лид создан', timestamp: new Date().toISOString() }],
      ...data,
    };
    _leads.unshift(lead);
    return lead;
  },
};

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => { await delay(); return [..._staff]; },
  updateRole: async (userId: string, role: StaffMember['role']): Promise<void> => {
    await delay(80);
    const member = _staff.find(m => m.id === userId);
    if (member) member.role = role;
  },
};

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => { await delay(); return [..._notifications]; },
  markRead: async (id: string): Promise<void> => {
    await delay(40);
    const n = _notifications.find(n => n.id === id);
    if (n) n.read = true;
  },
};
