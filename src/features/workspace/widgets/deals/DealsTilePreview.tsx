/**
 * DealsTilePreview — live mini-pipeline from deals store.
 * Shows stage columns with deal counts + weighted value.
 */
import { useEffect } from 'react';
import { useDealsStore } from '../../../deals-spa/model/deals.store';
import { STAGE_LABEL, STAGE_ACCENT, ACTIVE_STAGES } from '../../../deals-spa/api/types';
import s from './DealsTilePreview.module.css';

function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М';
  if (n >= 1_000) return Math.round(n / 1_000) + 'к';
  return String(n);
}

export function DealsTilePreview() {
  const { deals, loading, load } = useDealsStore();

  useEffect(() => {
    if (deals.length === 0 && !loading) load();
  }, []);

  const active = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const won    = deals.filter(d => d.stage === 'won');
  const totalWeighted = active.reduce((a, d) => a + d.value * (d.probability / 100), 0);

  if (loading && deals.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.shimmer}>
          {[1,2,3,4].map(i => (
            <div key={i} className={s.shimCol}>
              <div className={s.shimHdr} />
              <div className={s.shimCard} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {/* Stats bar */}
      <div className={s.statsBar}>
        <div className={s.chip}>
          <span className={s.chipDot} style={{ background: '#8b5cf6' }} />
          <span className={s.chipNum}>{active.length}</span>
          <span className={s.chipLabel}>активных</span>
        </div>
        {totalWeighted > 0 && (
          <div className={s.chip}>
            <span className={s.chipDot} style={{ background: '#22c55e' }} />
            <span className={s.chipNum} style={{ color: 'rgba(134,239,172,0.85)' }}>
              ~{fmtShort(totalWeighted)} ₸
            </span>
            <span className={s.chipLabel}>взвеш.</span>
          </div>
        )}
        {won.length > 0 && (
          <div className={s.chip}>
            <span className={s.chipDot} style={{ background: '#f59e0b' }} />
            <span className={s.chipNum}>{won.length}</span>
            <span className={s.chipLabel}>закрыто</span>
          </div>
        )}
      </div>

      {/* Mini pipeline */}
      <div className={s.pipeline}>
        {ACTIVE_STAGES.map(stage => {
          const col = active.filter(d => d.stage === stage);
          const colVal = col.reduce((a, d) => a + d.value * (d.probability / 100), 0);
          return (
            <div key={stage} className={s.col} style={{ '--acc': STAGE_ACCENT[stage] } as React.CSSProperties}>
              <div className={s.colTop}>
                <span className={s.dot} style={{ background: STAGE_ACCENT[stage] }} />
                <span className={s.colLabel}>{STAGE_LABEL[stage]}</span>
                <span className={s.colN}>{col.length}</span>
              </div>
              {colVal > 0 && (
                <div className={s.colVal}>~{fmtShort(colVal)} ₸</div>
              )}
              <div className={s.cards}>
                {col.length === 0 ? (
                  <div className={s.emptyCol} />
                ) : col.slice(0, 2).map(deal => (
                  <div key={deal.id} className={s.card}>
                    <div className={s.cardAv}>{deal.fullName[0]}</div>
                    <div className={s.cardInfo}>
                      <div className={s.cardName}>{deal.fullName.split(' ')[0]}</div>
                      <div className={s.cardAmt}>{fmtShort(deal.value)} ₸</div>
                    </div>
                    {/* Micro probability bar */}
                    <div className={s.miniBar}>
                      <div className={s.miniBarFill} style={{
                        width: `${deal.probability}%`,
                        background: deal.probability >= 75 ? '#22c55e' : deal.probability >= 45 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                  </div>
                ))}
                {col.length > 2 && (
                  <div className={s.more}>+{col.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
