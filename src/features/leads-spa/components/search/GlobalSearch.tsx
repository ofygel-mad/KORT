import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useLeadsStore } from '../../model/leads.store';
import s from './Search.module.css';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { leads, openDrawer } = useLeadsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length > 1
    ? leads.filter(l =>
        l.fullName.toLowerCase().includes(query.toLowerCase()) ||
        l.phone.includes(query)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (id: string) => {
    openDrawer(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button className={s.trigger} onClick={() => setOpen(true)}>
        <Search size={13} />
        <span>Поиск лидов...</span>
      </button>

      {open && (
        <>
          <div className={s.overlay} onClick={() => { setOpen(false); setQuery(''); }} />
          <div className={s.panel}>
            <div className={s.inputRow}>
              <Search size={15} className={s.inputIcon} />
              <input
                ref={inputRef}
                className={s.input}
                placeholder="Имя или номер телефона"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button className={s.clearBtn} onClick={() => setQuery('')}><X size={13} /></button>
              )}
            </div>
            {results.length > 0 && (
              <div className={s.results}>
                {results.map(lead => (
                  <button key={lead.id} className={s.resultItem} onClick={() => handleSelect(lead.id)}>
                    <div className={s.resultAvatar}>{lead.fullName[0]}</div>
                    <div className={s.resultBody}>
                      <span className={s.resultName}>{lead.fullName}</span>
                      <span className={s.resultPhone}>{lead.phone}</span>
                    </div>
                    <span className={s.resultPipeline}>
                      {lead.pipeline === 'qualifier' ? 'Квалификатор' : 'Клоузер'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.length > 1 && results.length === 0 && (
              <div className={s.noResults}>Ничего не найдено</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
