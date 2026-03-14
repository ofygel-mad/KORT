/**
 * features/deals-spa/model/deals.store.PATCH.md
 *
 * Patch instructions for deals.store.ts to connect it to the
 * extended shared-bus (dealLostQueue + snapshotQueue).
 *
 * ─────────────────────────────────────────────────────────────
 * 1. Add `publishDealLost` and `publishSnapshot` to imports:
 * ─────────────────────────────────────────────────────────────
 *
 * In `markLost`, after calling `useSharedBus.getState().publishDealReturned(...)`,
 * also add:
 *
 *   useSharedBus.getState().publishDealLost({
 *     dealId: id,
 *     leadId: deal.leadId,
 *     fullName: deal.fullName,
 *     value: deal.value,
 *     reason,
 *     lostAt: now,
 *   });
 *
 * ─────────────────────────────────────────────────────────────
 * 2. Add `publishSnapshot` helper to the store:
 * ─────────────────────────────────────────────────────────────
 *
 *   publishSnapshot: () => {
 *     const deals = get().deals;
 *     const now = new Date().toISOString();
 *     const startOfMonth = new Date();
 *     startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
 *
 *     const active = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
 *     const won    = deals.filter(d => d.stage === 'won');
 *     const lost   = deals.filter(d => d.stage === 'lost');
 *
 *     const wonThisMonth  = won.filter(d => d.wonAt  && new Date(d.wonAt)  >= startOfMonth);
 *     const lostThisMonth = lost.filter(d => d.lostAt && new Date(d.lostAt) >= startOfMonth);
 *
 *     const byStage: Record<string, { count: number; value: number }> = {};
 *     for (const d of active) {
 *       if (!byStage[d.stage]) byStage[d.stage] = { count: 0, value: 0 };
 *       byStage[d.stage].count++;
 *       byStage[d.stage].value += d.value;
 *     }
 *
 *     const lostReasonBreakdown: Record<string, number> = {};
 *     for (const d of lost) {
 *       if (d.lostReason) {
 *         lostReasonBreakdown[d.lostReason] = (lostReasonBreakdown[d.lostReason] ?? 0) + 1;
 *       }
 *     }
 *
 *     useSharedBus.getState().publishSnapshot({
 *       source: 'deals',
 *       totalActive:  active.length,
 *       totalWon:     won.length,
 *       totalLost:    lost.length,
 *       pipelineValue:  active.reduce((a, d) => a + d.value, 0),
 *       weightedValue:  active.reduce((a, d) => a + d.value * (d.probability / 100), 0),
 *       wonValueThisMonth:  wonThisMonth.reduce((a, d)  => a + d.value, 0),
 *       wonCountThisMonth:  wonThisMonth.length,
 *       lostCountThisMonth: lostThisMonth.length,
 *       byStage,
 *       lostReasonBreakdown,
 *       snapshotAt: now,
 *     });
 *   },
 *
 * ─────────────────────────────────────────────────────────────
 * 3. Call publishSnapshot() at the end of:
 *    - load()
 *    - markWon()
 *    - markLost()
 *    - createFromLead()
 *    - deleteDeal()
 * ─────────────────────────────────────────────────────────────
 */
export {};
