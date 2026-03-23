/**
 * CommandPalette — заменяет GlobalSearch.
 *
 * Революционный поиск в стиле Linear / Raycast:
 *   - ⌘K / Ctrl+K открывает с любого места в SPA
 *   - Fuzzy-поиск по имени, телефону, стадии, источнику
 *   - Результаты сгруппированы: Квалификатор / Клоузер
 *   - Keyboard navigation (↑↓ Enter Esc)
 *   - Подсветка совпадений
 *   - История последних 5 открытых лидов
 *   - Быстрое действие «Позвонить» прямо из результата
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Phone, X, Clock } from 'lucide-react';
import { PIPELINE_META, getLeadStageMeta } from '../../model/stage-meta';
import s from './Search.module.css';

interface Lead {
  id: string;
  fullName: string;
  phone: string;
  pipeline: 'qualifier' | 'closer';
  stage: string;
  source: string;
}

interface Props {
  leads: Lead[];
  onSelectLead: (id: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'IG', site: 'WEB', referral: 'REF', ad: 'ADS',
};

/** Подсветка совпадения */
function hl(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className={s.hlMark}>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

// ── Result item ──────────────────────────────────────────────
function ResultItem({
  lead, query, active, onHover, onSelect,
}: {
  lead: Lead; query: string; active: boolean;
  onHover: () => void; onSelect: () => void;
}) {
  const stageMeta = getLeadStageMeta(lead.stage);
  return (
    <div
      className={`${s.result} ${active ? s.resultActive : ''}`}
      data-active={active}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <div className={s.resultAvatar}>{lead.fullName[0]}</div>
      <div className={s.resultBody}>
        <div className={s.resultName}>{hl(lead.fullName, query)}</div>
        <div className={s.resultMeta}>
          <span className={s.resultPhone}>{lead.phone}</span>
          <span className={s.resultSrc}>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
        </div>
      </div>
      <div className={s.resultRight}>
        <span className={s.resultStage} data-tone={stageMeta.tone}>
          {stageMeta.shortLabel}
        </span>
        <a
          className={s.callBtn}
          href={`tel:${lead.phone}`}
          title="Позвонить"
          onClick={e => e.stopPropagation()}
        >
          <Phone size={11} />
        </a>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function CommandPalette({ leads, onSelectLead }: Props) {
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Фокус при открытии
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Фильтрация
  const q = query.trim().toLowerCase();
  const filtered = q.length > 0
    ? leads.filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        getLeadStageMeta(l.stage).label.toLowerCase().includes(q) ||
        (SOURCE_LABEL[l.source] ?? '').toLowerCase().includes(q)
      )
    : [];

  const qualifier = filtered.filter(l => l.pipeline === 'qualifier');
  const closer    = filtered.filter(l => l.pipeline === 'closer');
  const flat      = [...qualifier, ...closer];

  const recentLeads = recentIds
    .map(id => leads.find(l => l.id === id))
    .filter(Boolean) as Lead[];

  const displayList = q.length > 0 ? flat : recentLeads;

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, displayList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayList[activeIdx]) handleSelect(displayList[activeIdx].id);
      } else if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeIdx, displayList, close]);

  // Прокрутка активного элемента
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelect = (id: string) => {
    setRecentIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 5));
    onSelectLead(id);
    close();
  };

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const kbdHint = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      {/* ── Trigger ──────────────────────────────────── */}
      <button className={s.trigger} onClick={() => setOpen(true)}>
        <Search size={13} className={s.triggerIcon} />
        <span className={s.triggerPlaceholder}>Поиск лидов...</span>
        <kbd className={s.triggerKbd}>{kbdHint}</kbd>
      </button>

      {/* ── Overlay + Palette ─────────────────────────── */}
      {open && (
        <div
          className={s.overlay}
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div className={s.palette}>

            {/* Input */}
            <div className={s.inputRow}>
              <Search size={16} className={s.inputIcon} />
              <input
                ref={inputRef}
                className={s.input}
                placeholder="Имя, телефон, статус или источник..."
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  className={s.clearBtn}
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                >
                  <X size={13} />
                </button>
              )}
              <kbd className={s.escKbd} onClick={close}>Esc</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className={s.resultArea}>

              {/* Нет запроса, есть история */}
              {q.length === 0 && recentLeads.length > 0 && (
                <div className={s.group}>
                  <div className={s.groupLabel}>
                    <Clock size={10} />
                    Недавно открытые
                  </div>
                  {recentLeads.map((lead, i) => (
                    <ResultItem
                      key={lead.id} lead={lead} query="" active={activeIdx === i}
                      onHover={() => setActiveIdx(i)}
                      onSelect={() => handleSelect(lead.id)}
                    />
                  ))}
                </div>
              )}

              {/* Нет запроса и нет истории */}
              {q.length === 0 && recentLeads.length === 0 && (
                <div className={s.emptyHint}>
                  <Search size={22} className={s.emptyIcon} />
                  <div className={s.emptyText}>Начните вводить имя, телефон или статус</div>
                  <div className={s.emptySubtext}>
                    Поиск по {leads.length} лид{leads.length === 1 ? 'у' : 'ам'} в реальном времени
                  </div>
                </div>
              )}

              {/* Есть запрос — группированные результаты */}
              {q.length > 0 && (
                <>
                  {qualifier.length > 0 && (
                    <div className={s.group}>
                      <div className={s.groupLabel} data-tone={PIPELINE_META.qualifier.tone}>
                        {PIPELINE_META.qualifier.shortLabel}
                        <span className={s.groupCount}>{qualifier.length}</span>
                      </div>
                      {qualifier.map((lead, i) => (
                        <ResultItem
                          key={lead.id} lead={lead} query={query} active={activeIdx === i}
                          onHover={() => setActiveIdx(i)}
                          onSelect={() => handleSelect(lead.id)}
                        />
                      ))}
                    </div>
                  )}
                  {closer.length > 0 && (
                    <div className={s.group}>
                      <div className={s.groupLabel} data-tone={PIPELINE_META.closer.tone}>
                        {PIPELINE_META.closer.shortLabel}
                        <span className={s.groupCount}>{closer.length}</span>
                      </div>
                      {closer.map((lead, i) => (
                        <ResultItem
                          key={lead.id} lead={lead} query={query}
                          active={activeIdx === qualifier.length + i}
                          onHover={() => setActiveIdx(qualifier.length + i)}
                          onSelect={() => handleSelect(lead.id)}
                        />
                      ))}
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className={s.noResults}>
                      Нет лидов по запросу «{query}»
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer с хинтами по клавишам */}
            {displayList.length > 0 && (
              <div className={s.footer}>
                <span><kbd className={s.footerKbd}>↑↓</kbd> навигация</span>
                <span><kbd className={s.footerKbd}>Enter</kbd> открыть</span>
                <span><kbd className={s.footerKbd}>Esc</kbd> закрыть</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
