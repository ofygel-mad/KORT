import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import { toast } from 'sonner';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { SpreadsheetReview } from '../../widgets/spreadsheet-review/SpreadsheetReview';
import s from './Imports.module.css';

/* ── Types & constants ───────────────────────────────────────── */
const KORT_FIELDS = [
  { value: '',             label: '— Не импортировать —' },
  { value: 'full_name',    label: 'Имя клиента'  },
  { value: 'phone',        label: 'Телефон'       },
  { value: 'email',        label: 'Email'         },
  { value: 'company_name', label: 'Компания'      },
  { value: 'source',       label: 'Источник'      },
  { value: 'status',       label: 'Статус'        },
];

interface ImportJob {
  id: string; status: string; import_type: string;
  preview_json?: { headers: string[]; rows: string[][]; total: number; auto_mapping: Record<string, string> };
  result_json?: { success: number; errors: number; duplicates: number };
  created_at: string;
}

const STEPS = ['Загрузка', 'Маппинг', 'Импорт'];

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Загружен', analyzing: 'Анализ', mapping_required: 'Требуется маппинг',
  mapping_confirmed: 'Маппинг подтверждён', processing: 'Обработка',
  completed: 'Завершён', failed: 'Ошибка', pending: 'Ожидание',
};

/* bg/color are hardcoded hex pairs for status badges — not token-based
   because status colours are product-semantic, not design-system-semantic */
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  completed:         { bg: 'var(--fill-positive-soft)', color: 'var(--fill-positive-text)' },
  failed:            { bg: 'var(--fill-negative-soft)', color: 'var(--fill-negative-text)' },
  processing:        { bg: 'var(--fill-info-soft)',     color: 'var(--fill-info-text)'     },
  analyzing:         { bg: 'var(--fill-info-soft)',     color: 'var(--fill-info-text)'     },
  mapping_required:  { bg: 'var(--fill-warning-soft)',  color: 'var(--fill-warning-text)'  },
  mapping_confirmed: { bg: 'var(--fill-accent-soft)',   color: 'var(--fill-accent)'         },
  uploaded:          { bg: 'var(--bg-surface-inset)',   color: 'var(--text-secondary)'      },
  pending:           { bg: 'var(--bg-surface-inset)',   color: 'var(--text-secondary)'      },
};

/* ── Step helpers ────────────────────────────────────────────── */
function dotClass(idx: number, current: number) {
  return idx < current ? s.done : idx === current ? s.active : s.pending;
}
function numClass(idx: number, current: number) {
  return idx === current ? s.active : s.pending;
}
function connClass(idx: number, current: number) {
  return idx < current ? s.done : s.pending;
}

/* ── Page ────────────────────────────────────────────────────── */
export default function ImportsPage() {
  useDocumentTitle('Импорт');
  const qc       = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [mapping, setMapping]         = useState<Record<string, string>>({});
  const [wizardStep, setWizardStep]   = useState(0);

  const { data: jobs, isLoading } = useQuery<{ results: ImportJob[] }>({
    queryKey: ['import-jobs'],
    queryFn: () => api.get('/imports/'),
    refetchInterval: (query) => {
      const active = (query.state.data as { results: ImportJob[] } | undefined)?.results.some(
        j => ['processing', 'analyzing', 'mapping_required', 'mapping_confirmed'].includes(j.status),
      );
      return active ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('import_type', 'customers');
      return api.post<ImportJob>('/imports/', fd as unknown as object);
    },
    onSuccess: (job: ImportJob) => {
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      setActiveJobId(job.id);
      setWizardStep(1);
      toast.success('Файл загружен, анализируем...');
    },
    onError: () => toast.error('Ошибка загрузки файла'),
  });

  const startImport = useMutation({
    mutationFn: () => api.post(`/imports/${activeJobId}/start/`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['import-jobs'] }),
  });

  const confirmMapping = useMutation({
    mutationFn: () => api.post(`/imports/${activeJobId}/mapping/`, { column_mapping: mapping }),
    onSuccess:  () => { setWizardStep(2); startImport.mutate(); },
  });

  const activeJob = jobs?.results.find(j => j.id === activeJobId);
  const preview   = activeJob?.preview_json;

  useEffect(() => {
    if (preview?.auto_mapping && Object.keys(mapping).length === 0) {
      setMapping(preview.auto_mapping);
    }
  }, [preview, mapping]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV');
      return;
    }
    uploadMutation.mutate(file);
  }

  function resetWizard() { setWizardStep(0); setActiveJobId(null); setMapping({}); }

  return (
    <div className={s.page}>
      <PageHeader title="Импорт данных" subtitle="Загрузите клиентов из Excel или CSV" />

      {/* ── Wizard card ────────────────────────────────────── */}
      <div className={s.wizardCard}>

        {/* Step indicators */}
        <div className={s.steps}>
          {STEPS.map((label, idx) => (
            <div key={label} className={s.stepItem}>
              <div className={`${s.stepDot} ${dotClass(idx, wizardStep)}`}>
                {idx < wizardStep
                  ? <CheckCircle2 size={14} color="#fff" />
                  : <span className={`${s.stepNum} ${numClass(idx, wizardStep)}`}>{idx + 1}</span>
                }
              </div>
              <span className={`${s.stepLabel} ${idx === wizardStep ? s.active : s.other}`}>{label}</span>
              {idx < STEPS.length - 1 && (
                <div className={`${s.stepConnector} ${connClass(idx, wizardStep)}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Step 0 — upload */}
          {wizardStep === 0 && (
            <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className={s.hiddenInput} onChange={handleFileChange} />
              <motion.div
                className={`${s.dropZone} ${uploadMutation.isPending ? s.uploading : ''}`}
                whileHover={{ borderColor: 'var(--fill-accent)' }}
                onClick={() => inputRef.current?.click()}
              >
                {uploadMutation.isPending ? (
                  <div className={s.spinnerWrap}>
                    <div className={s.spinner} />
                    <span className={s.spinnerLabel}>Загружаем и анализируем...</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} color="var(--fill-accent)" className={s.dropIcon} />
                    <div className={s.dropTitle}>Перетащите файл или нажмите</div>
                    <div className={s.dropDesc}>Поддерживаются .xlsx, .xls, .csv</div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Step 1 — column mapping */}
          {wizardStep === 1 && preview && (
            <motion.div key="mapping" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className={s.mappingHeader}>
                <div>
                  <div className={s.mappingTitle}>Сопоставление колонок</div>
                  <div className={s.mappingCount}>Всего строк: {preview.total}</div>
                </div>
                <div className={s.mappingActions}>
                  <Button variant="secondary" size="sm" onClick={resetWizard}>Заново</Button>
                  <Button size="sm" loading={confirmMapping.isPending} iconRight={<ArrowRight size={13} />} onClick={() => confirmMapping.mutate()}>
                    Импортировать
                  </Button>
                </div>
              </div>

              <div className={s.mappingGrid}>
                {preview.headers.map(header => (
                  <div key={header} className={s.mappingRow}>
                    <span className={s.mappingColName}>{header}</span>
                    <ArrowRight size={12} className={s.mappingArrow} />
                    <select
                      value={mapping[header] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                      className={`kort-input ${s.mappingSelect}`}
                    >
                      {KORT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className={s.previewLabel}>Предварительный просмотр (первые 5 строк)</div>
              <div className={s.previewTableWrap}>
                <table className={s.previewTable}>
                  <thead>
                    <tr>
                      {preview.headers.map(h => <th key={h} className={s.previewTh}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} className={s.previewTd}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Step 2 — result */}
          {wizardStep === 2 && (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {activeJob?.status === 'processing' ? (
                <div className={s.resultCenter}>
                  <div className={s.resultSpinner} />
                  <div className={s.resultProcessingTitle}>Импортируем клиентов...</div>
                  <div className={s.resultProcessingDesc}>Обновим результат автоматически</div>
                </div>
              ) : activeJob?.status === 'completed' ? (
                <div className={s.resultCenter}>
                  <CheckCircle2 size={40} color="var(--fill-positive)" className={s.resultSuccessIcon} />
                  <div className={s.resultSuccessTitle}>Импорт завершён!</div>
                  <div className={s.statsRow}>
                    {[
                      { label: 'Успешно', value: activeJob.result_json?.success ?? 0, color: 'var(--fill-positive)' },
                      { label: 'Дублей',  value: activeJob.result_json?.duplicates ?? 0, color: 'var(--fill-warning)' },
                      { label: 'Ошибок',  value: activeJob.result_json?.errors ?? 0, color: 'var(--fill-negative)' },
                    ].map(stat => (
                      <div key={stat.label} className={s.statItem}>
                        <div className={s.statValue} style={{ '--stat-color': stat.color } as CSSProperties}>{stat.value}</div>
                        <div className={s.statLabel}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <Button className={s.resultNewImport} onClick={resetWizard}>Новый импорт</Button>
                </div>
              ) : (
                <div className={s.resultError}>
                  <AlertCircle size={32} className={s.resultErrorIcon} />
                  <div>Ошибка импорта. Попробуйте снова.</div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── History ─────────────────────────────────────────── */}
      <div className={s.historyCard}>
        <div className={s.historyTitle}>История импортов</div>

        {isLoading
          ? [1, 2, 3].map(i => (
              <div key={i} className={s.historySkeletonRow}>
                <Skeleton height={14} width="50%" />
              </div>
            ))
          : (jobs?.results ?? []).length === 0
            ? <div className={s.historyEmpty}>Импортов не было</div>
            : (jobs?.results ?? []).map(job => {
                const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                return (
                  <div key={job.id} className={s.historyRow}>
                    <div className={s.historyRowLeft}>
                      <FileText size={14} className={s.historyIcon} />
                      <div>
                        <div className={s.historyJobName}>Импорт клиентов</div>
                        <div className={s.historyJobDate}>
                          {new Date(job.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    {/* bg/color runtime from badge map → inline correct */}
                    <div className={s.statusBadge} style={{ '--status-bg': badge.bg, '--status-color': badge.color } as CSSProperties}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}
