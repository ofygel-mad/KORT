import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import s from './Search.module.css';

interface Props {
  leads: { id: string; fullName: string; phone: string; pipeline: string }[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectLead: (id: string) => void;
}

export function GlobalSearch({ leads, searchQuery, setSearchQuery, onSelectLead }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = searchQuery.trim().length > 1
    ? leads.filter(l =>
        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.includes(searchQuery)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (id: string) => {
    onSelectLead(id);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <button className={s.trigger} onClick={() => setOpen(true)}>
        <Search size={13} />
        <span>Поиск лидов...</span>
      </button>

      {open && (
        <>
          <div className={s.overlay} onClick={() => { setOpen(false); setSearchQuery(''); }} />
          <div className={s.panel}>
            <div className={s.inputRow}>
              <Search size={15} className={s.inputIcon} />
              <input
                ref={inputRef}
                className={s.input}
                placeholder="Имя или номер телефона"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={s.clearBtn} onClick={() => setSearchQuery('')}><X size={13} /></button>
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
            {searchQuery.length > 1 && results.length === 0 && (
              <div className={s.noResults}>Ничего не найдено</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
