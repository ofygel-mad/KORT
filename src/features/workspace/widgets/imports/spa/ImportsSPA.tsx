/**
 * Imports SPA — Data import and sync management.
 * Lives at: src/features/workspace/widgets/imports/spa/ImportsSPA.tsx
 */
import { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw } from 'lucide-react';
import s from './ImportsSPA.module.css';

const MOCK_IMPORTS = [
  { id:'1', name:'clients_march.xlsx', status:'done',    rows:142, date:'14 мар 2026' },
  { id:'2', name:'deals_q1.csv',       status:'error',   rows:0,   date:'13 мар 2026' },
  { id:'3', name:'contacts_2025.xlsx', status:'done',    rows:891, date:'02 мар 2026' },
];

const STATUS = {
  done:    { label:'Загружено', color:'#22c55e', Icon: Check },
  error:   { label:'Ошибка',   color:'#ef4444', Icon: AlertCircle },
  pending: { label:'В очереди', color:'#f59e0b', Icon: RefreshCw },
};

export function ImportsSPA() {
  const [dragging, setDragging] = useState(false);

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span className={s.title}>Импорт данных</span>
        <button className={s.syncBtn}><RefreshCw size={13} /> Синхронизировать</button>
      </div>

      <div
        className={`${s.dropzone} ${dragging ? s.dropzoneActive : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); }}
      >
        <Upload size={28} className={s.dropIcon} />
        <span className={s.dropTitle}>Перетащите файл сюда</span>
        <span className={s.dropSub}>Excel (.xlsx), CSV, JSON · до 50 МБ</span>
        <button className={s.dropBtn}>Выбрать файл</button>
      </div>

      <div className={s.historySection}>
        <div className={s.sectionTitle}>История импортов</div>
        {MOCK_IMPORTS.map(imp => {
          const meta = STATUS[imp.status as keyof typeof STATUS];
          return (
            <div key={imp.id} className={s.importRow}>
              <FileSpreadsheet size={18} className={s.fileIcon} />
              <div className={s.importBody}>
                <span className={s.importName}>{imp.name}</span>
                <span className={s.importMeta}>{imp.date}{imp.rows > 0 ? ` · ${imp.rows} строк` : ''}</span>
              </div>
              <span className={s.importStatus} style={{ '--s-color': meta.color } as React.CSSProperties}>
                <meta.Icon size={12} />
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
