import { useState, type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { successBurst } from '../../shared/motion/presets';
import { CheckCircle2, Zap, Factory, ChevronRight, ArrowLeft, Users, Sparkles, LayoutDashboard, Store, HandCoins, BriefcaseBusiness, Blocks } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';
import { KortLogo } from '../../shared/ui/KortLogo';
import { useAuthStore } from '../../shared/stores/auth';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { toast } from 'sonner';
import s from './Onboarding.module.css';

/* ── Data ────────────────────────────────────────────────────── */
const BUSINESS_TYPES = [
  { value: 'retail', label: 'Розничная торговля', description: 'Точки продаж, онлайн-заказы, повторные покупки', icon: <Store size={18} /> },
  { value: 'services', label: 'Услуги', description: 'Запись клиентов, повторные касания, контроль сервиса', icon: <HandCoins size={18} /> },
  { value: 'sales', label: 'B2B и продажи', description: 'Лиды, переговоры, коммерческие предложения', icon: <BriefcaseBusiness size={18} /> },
  { value: 'production', label: 'Производство', description: 'Длинный цикл сделки, согласования, контроль этапов', icon: <Factory size={18} /> },
  { value: 'other', label: 'Другое направление', description: 'Гибкая настройка под ваш процесс без жёсткого шаблона', icon: <Blocks size={18} /> },
];

const SIZES = [
  { value: '1_5',     label: '1–5'   },
  { value: '6_20',    label: '6–20'  },
  { value: '21_100',  label: '21–100' },
  { value: '100_plus',label: '100+'  },
];

interface ModeCard {
  mode: string; title: string; subtitle: string;
  features: string[]; icon: ReactNode; color: string;
}

const MODES: ModeCard[] = [
  {
    mode: 'basic', title: 'Базовый', subtitle: 'Для малого бизнеса',
    features: ['Клиенты и сделки', 'Задачи', 'Простые отчёты'],
    icon: <Users size={22} />, color: '#3B82F6',
  },
  {
    mode: 'advanced', title: 'Продвинутый', subtitle: 'Для растущей команды',
    features: ['Воронки и этапы', 'Роли сотрудников', 'Автоматизации', 'Расширенная аналитика'],
    icon: <Zap size={22} />, color: '#D97706',
  },
  {
    mode: 'industrial', title: 'Промышленный', subtitle: 'Для крупного бизнеса',
    features: ['Филиалы', 'API и интеграции', 'Аудит', 'Сложные права', 'SLA'],
    icon: <Factory size={22} />, color: '#8B5CF6',
  },
];

const STEPS = ['Ваш бизнес', 'Режим Kort', 'Быстрый старт'];

const QUICK_LINKS = [
  { icon: '👤', title: 'Добавьте первого клиента',   desc: 'Создайте карточку или импортируйте из Excel', path: '/customers' },
  { icon: '💼', title: 'Создайте первую сделку',     desc: 'Добавьте клиента в воронку продаж',           path: '/deals' },
  { icon: '📥', title: 'Импорт из Excel',            desc: 'Загрузите существующую базу клиентов',        path: '/imports' },
];

/* ── Page ────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  useDocumentTitle('Начало работы');
  const navigate       = useNavigate();
  const user           = useAuthStore(st => st.user);
  const setOrg         = useAuthStore(st => st.setOrg);
  const [step, setStep]           = useState(0);
  const [industry, setIndustry]   = useState('');
  const [companySize, setSize]    = useState('');
  const [selectedMode, setMode]   = useState('advanced');

  const setupMutation = useMutation({
    mutationFn: ({ nextPath, ...data }: { nextPath: string; mode: string; industry: string; company_size: string; onboarding_completed: boolean }) =>
      api.patch('/organization/', data),
    onSuccess: (updated: any, variables) => {
      setOrg({ onboarding_completed: true, ...(updated ?? {}) });
      const modeLabel = MODES.find((m) => m.mode === selectedMode)?.title ?? 'Ваш режим';
      const businessLabel = BUSINESS_TYPES.find((b) => b.value === industry)?.label ?? 'ваш бизнес';
      const nextPath = variables?.nextPath ?? '/';
      const handoffMap: Record<string, string> = {
        '/': `Онбординг завершён · ${modeLabel} для направления «${businessLabel}» уже собран в Kort Home. Сначала проверьте входящий поток, затем создайте первую рабочую сущность.`,
        '/customers': 'Онбординг завершён · начните с клиентов, чтобы быстро превратить контекст бизнеса в рабочую базу.',
        '/deals': 'Онбординг завершён · переходите к первой сделке, пока логика продаж ещё свежа после настройки.',
        '/imports': 'Онбординг завершён · загрузите базу и сразу перенесите запуск в живой операционный контур.',
      };
      localStorage.setItem('kort:product-moment', handoffMap[nextPath] ?? handoffMap['/']);
      toast.success('Настройки сохранены');
      navigate(nextPath, { replace: true });
    },
  });

  const canNext   = step === 0 ? (industry !== '' && companySize !== '') : true;
  const cardClass = step === 1 ? s.cardWide : s.cardNarrow;

  function handleFinish(nextPath = '/') {
    setupMutation.mutate({
      nextPath,
      mode: selectedMode,
      industry,
      company_size: companySize,
      onboarding_completed: true,
    });
  }

  function handleQuickLink(path: string) {
    handleFinish(path);
  }

  /* ── Step dot helpers ────────────────────────────────────────── */
  function dotClass(idx: number)   { return idx < step ? s.done   : idx === step ? s.active  : s.pending; }
  function labelClass(idx: number) { return idx === step ? s.active : s.other; }
  function connClass(idx: number)  { return idx < step ? s.done : s.pending; }

  return (
    <div className={s.page}>
      {/* Logo */}
      <motion.div className={s.logoRow} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <KortLogo size={40} />
        <span className={s.logoLabel}>Kort</span>
      </motion.div>

      {/* Steps */}
      <div className={s.steps}>
        {STEPS.map((label, idx) => (
          <div key={label} className={s.stepItem}>
            <div className={s.stepDotWrap}>
              <div className={`${s.stepDot} ${dotClass(idx)}`}>
                {idx < step
                  ? <CheckCircle2 size={14} color="#fff" />
                  : <span className={`${s.stepDotNum} ${dotClass(idx)}`}>{idx + 1}</span>
                }
              </div>
              <span className={`${s.stepLabel} ${labelClass(idx)}`}>{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`${s.stepConnector} ${connClass(idx)}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content card */}
      <motion.div
        key={step}
        className={`${s.card} ${cardClass}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <div className={s.scenarioRail}>
          <div className={s.scenarioCopy}>
            <span className={s.scenarioEyebrow}><Sparkles size={12} /> Сценарий запуска</span>
            <div className={s.scenarioText}>Заполняем контекст бизнеса, выбираем режим и сразу ведём в первый полезный шаг без пустых экранов.</div>
          </div>
          <div className={s.scenarioChips}>
            <span className={s.scenarioChip}>Контекст</span>
            <span className={s.scenarioChip}>Режим</span>
            <span className={s.scenarioChip}>Первое действие</span>
          </div>
        </div>
        {/* ── Step 0: business info ────────────────────────── */}
        {step === 0 && (
          <>
            <h2 className={s.sectionTitle}>Расскажите о вашем бизнесе</h2>
            <p className={s.sectionDesc}>Мы не будем привязывать интерфейс к одному сценарию. Нужен только стартовый контекст, чтобы Kort собрал для вас правильный рабочий контур.</p>

            <p className={s.subLabel}>Тип бизнеса</p>
            <div className={s.industryGrid}>
              {BUSINESS_TYPES.map(bt => (
                <motion.button
                  key={bt.value}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIndustry(bt.value)}
                  className={`${s.industryBtn} ${industry === bt.value ? s.selected : ''}`}
                >
                  <span className={s.industryIcon}>{bt.icon}</span>
                  <span className={s.industryMeta}>
                    <span className={`${s.industryLabel} ${industry === bt.value ? s.selected : s.default}`}>{bt.label}</span>
                    <span className={s.industryDesc}>{bt.description}</span>
                  </span>
                </motion.button>
              ))}
            </div>

            <p className={s.subLabel}>Размер команды</p>
            <div className={s.sizeGrid}>
              {SIZES.map(sz => (
                <motion.button
                  key={sz.value}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSize(sz.value)}
                  className={`${s.sizeBtn} ${companySize === sz.value ? s.selected : s.default}`}
                >
                  {sz.label}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 1: plan selection ───────────────────────── */}
        {step === 1 && (
          <>
            <h2 className={s.sectionTitle}>Выберите режим Kort</h2>
            <p className={s.sectionDesc}>Вы сможете изменить это позже в настройках</p>
            <div className={s.planGrid}>
              {MODES.map(m => (
                <motion.button
                  key={m.mode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode(m.mode)}
                  className={s.planCard}
                  style={{
                    '--plan-color': m.color,
                    '--plan-card-border': selectedMode === m.mode ? m.color : 'var(--border-default)',
                    '--plan-card-bg': selectedMode === m.mode ? `${m.color}08` : 'var(--bg-surface)',
                    '--plan-card-ring': selectedMode === m.mode ? `0 0 0 3px ${m.color}22` : 'none',
                  } as CSSProperties}
                >
                  <div className={s.planIcon}>
                    {m.icon}
                  </div>
                  <div className={s.planTitle}>{m.title}</div>
                  <div className={s.planSubtitle}>{m.subtitle}</div>
                  <div className={s.planFeatures}>
                    {m.features.map(f => (
                      <div key={f} className={s.planFeature}>
                        <span className={s.planFeatureDot}>
                          <CheckCircle2 size={9} color="#fff" />
                        </span>
                        {f}
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: quick start ──────────────────────────── */}
        {step === 2 && (
          <>
            <motion.div className={s.successStep} variants={successBurst} initial="hidden" animate="visible">
              <div className={s.successEmoji}>🎉</div>
              <h2 className={s.successTitle}>Вы готовы к работе!</h2>
              <p className={s.successDesc}>Привет, {user?.full_name?.split(' ')[0]}! Kort настроена и готова.</p>
            </motion.div>

            <div className={s.completionActions}>
              <Button variant="secondary" size="sm" icon={<LayoutDashboard size={14} />} onClick={() => handleFinish('/')}>
                Открыть Kort Home
              </Button>
              <span className={s.completionHint}>Или сразу перейдите в первый рабочий сценарий:</span>
            </div>

            <div className={s.quickLinks}>
              {QUICK_LINKS.map(item => (
                <motion.button
                  key={item.title}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickLink(item.path)}
                  className={s.quickLinkBtn}
                >
                  <span className={s.quickLinkEmoji}>{item.icon}</span>
                  <div className={s.quickLinkBody}>
                    <div className={s.quickLinkTitle}>{item.title}</div>
                    <div className={s.quickLinkDesc}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} className={s.quickLinkChevron} />
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* Nav */}
        <div className={s.navRow}>
          <Button
            variant="ghost" size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={() => step > 0 && setStep(step - 1)}
            className={step === 0 ? s.navBackHidden : undefined}
          >
            Назад
          </Button>

          {step < STEPS.length - 1
            ? <Button disabled={!canNext} iconRight={<ChevronRight size={14} />} onClick={() => setStep(step + 1)}>Продолжить</Button>
            : <Button loading={setupMutation.isPending} onClick={() => handleFinish('/')}>Начать работу</Button>
          }
        </div>
      </motion.div>

      {step === STEPS.length - 1 && (
        <button className={s.skipLink} onClick={() => handleFinish('/')}>
          Завершить настройку и открыть Kort Home →
        </button>
      )}
    </div>
  );
}
