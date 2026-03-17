import { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Settings,
  ArrowDownToLine,
  GitMerge,
  History,
} from 'lucide-react';
import s from './ImportsSPA.module.css';

interface Props {
  tileId: string;
}

interface Section {
  id: string;
  label: string;
  icon: typeof Upload;
}

const SECTIONS: Section[] = [
  { id: 'upload',   label: 'Загрузка',    icon: ArrowDownToLine },
  { id: 'mapping',  label: 'Маппинг',     icon: GitMerge },
  { id: 'history',  label: 'История',     icon: History },
  { id: 'settings', label: 'Настройки',   icon: Settings },
];

const MOCK_IMPORTS = [
  { id: '1', name: 'clients_march.xlsx', status: 'done',    rows: 142, date: '14 мар 2026' },
  { id: '2', name: 'deals_q1.csv',       status: 'error',   rows: 0,   date: '13 мар 2026' },
  { id: '3', name: 'contacts_2025.xlsx', status: 'done',    rows: 891, date: '02 мар 2026' },
];

const STATUS = {
  done:    { label: 'Загружено', color: '#22c55e', Icon: Check },
  error:   { label: 'Ошибка',   color: '#ef4444', Icon: AlertCircle },
  pending: { label: 'В очереди', color: '#f59e0b', Icon: RefreshCw },
};

function UploadSection() {
  const [dragging, setDragging] = useState(false);

  return (
    <div className={s.uploadSection}>
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

      <div className={s.recentSection}>
        <div className={s.sectionLabel}>Последние загрузки</div>
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

function SectionPlaceholder({ section }: { section: Section }) {
  const Icon = section.icon;

  return (
    <div className={s.placeholder}>
      <Icon size={36} className={s.placeholderIcon} />
      <div className={s.placeholderTitle}>{section.label}</div>
      <div className={s.placeholderDesc}>Раздел в процессе подключения</div>
    </div>
  );
}

export function ImportsSPA({ tileId }: Props) {
  const [activeSection, setActiveSection] = useState('upload');

  const currentSection = SECTIONS.find(sec => sec.id === activeSection) ?? SECTIONS[0];

  return (
    <div className={s.root} data-tile-id={tileId}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <ArrowDownToLine size={18} className={s.headerIcon} />
          <span className={s.title}>Импорт</span>
        </div>
        <div className={s.headerActions}>
          <button className={s.iconBtn} aria-label="Поиск">
            <Search size={15} />
          </button>
          <button className={s.iconBtn} aria-label="Фильтры">
            <Filter size={15} />
          </button>
          <button className={s.syncBtn}>
            <RefreshCw size={13} />
            <span>Синхронизировать</span>
          </button>
        </div>
      </div>

      {/* ── Navigation tabs ── */}
      <nav className={s.nav}>
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            className={`${s.navItem} ${activeSection === sec.id ? s.navItemActive : ''}`}
            onClick={() => setActiveSection(sec.id)}
          >
            <sec.icon size={14} />
            <span>{sec.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Content area ── */}
      <div className={s.content}>
        {activeSection === 'upload' && <UploadSection />}
        {activeSection !== 'upload' && <SectionPlaceholder section={currentSection} />}
      </div>

      {/* ── Status bar ── */}
      <div className={s.statusBar}>
        <span className={s.statusDot} />
        <span>Подключение активно</span>
        <span className={s.statusCount}>3 файла загружено</span>
      </div>
    </div>
  );
}
