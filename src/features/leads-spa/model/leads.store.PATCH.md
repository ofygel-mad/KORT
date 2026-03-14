/**
 * features/leads-spa/model/leads.store.PATCH.md
 *
 * Add these changes to leads.store.ts so Summary SPA receives leads data.
 *
 * ─────────────────────────────────────────────────────────────
 * 1. Add `_publishLeadsSnapshot` helper BEFORE the store:
 * ─────────────────────────────────────────────────────────────
 *
 * function _publishLeadsSnapshot(leads: Lead[]) {
 *   const byStage: Record<string, number> = {};
 *   for (const l of leads) {
 *     byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
 *   }
 *
 *   const startOfMonth = new Date();
 *   startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
 *
 *   // Count leads that have been converted (pipeline = 'closer')
 *   const convertedThisMonth = leads.filter(
 *     l => l.pipeline === 'closer' && new Date(l.createdAt) >= startOfMonth
 *   ).length;
 *
 *   useSharedBus.getState().publishSnapshot({
 *     source: 'leads',
 *     totalLeads: leads.length,
 *     byStage,
 *     convertedThisMonth,
 *     snapshotAt: new Date().toISOString(),
 *   });
 * }
 *
 * ─────────────────────────────────────────────────────────────
 * 2. Call _publishLeadsSnapshot(leads) at the end of:
 *    - load() after set({ leads, loading: false })
 *    - convertLead() after updating the store
 *    - createLead() after adding to store
 * ─────────────────────────────────────────────────────────────
 */
export {};
