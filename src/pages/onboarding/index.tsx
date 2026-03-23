import { setProductMoment } from '../../shared/utils/productMoment';
import { useState, type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { successBurst } from '../../shared/motion/presets';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Blocks,
  CheckCircle2,
  ChevronRight,
  Factory,
  FileSpreadsheet,
  HandCoins,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';
import { KortLogo } from '../../shared/ui/KortLogo';
import { useAuthStore } from '../../shared/stores/auth';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { toast } from 'sonner';
import s from './Onboarding.module.css';

const BUSINESS_TYPES = [
  {
    value: 'retail',
    label: 'Розничная торговля',
    description: 'Точки продаж, онлайн-заказы и повторные покупки в одном контуре.',
    icon: <Store size={18} />,
  },
  {
    value: 'services',
    label: 'Услуги',
    description: 'Запись клиентов, повторные касания и контроль сервиса.',
    icon: <HandCoins size={18} />,
  },
  {
    value: 'sales',
    label: 'B2B и продажи',
    description: 'Лиды, переговоры и коммерческие предложения без ручной рутины.',
    icon: <BriefcaseBusiness size={18} />,
  },
  {
    value: 'production',
    label: 'Производство',
    description: 'Длинный цикл сделки, согласования и контроль этапов исполнения.',
    icon: <Factory size={18} />,
  },
  {
    value: 'other',
    label: 'Другое направление',
    description: 'Гибкая настройка под ваш процесс без жёсткого шаблона.',
    icon: <Blocks size={18} />,
  },
] as const;

const SIZES = [
  { value: '1_5', label: '1-5' },
  { value: '6_20', label: '6-20' },
  { value: '21_100', label: '21-100' },
  { value: '100_plus', label: '100+' },
] as const;

interface ModeCard {
  mode: string;
  title: string;
  subtitle: string;
  features: string[];
  icon: ReactNode;
  color: string;
}

const MODES: ModeCard[] = [
  {
    mode: 'basic',
    title: 'Базовый',
    subtitle: 'Для малого бизнеса',
    features: ['Клиенты и сделки', 'Задачи', 'Простые отчёты'],
    icon: <Users size={20} />,
    color: '#3B82F6',
  },
  {
    mode: 'advanced',
    title: 'Продвинутый',
    subtitle: 'Для растущей команды',
    features: ['Воронки и этапы', 'Роли сотрудников', 'Автоматизации', 'Аналитика'],
    icon: <Zap size={20} />,
    color: '#D97706',
  },
  {
    mode: 'industrial',
    title: 'Промышленный',
    subtitle: 'Для сложных процессов',
    features: ['Филиалы', 'API и интеграции', 'Аудит', 'Сложные права', 'SLA'],
    icon: <Factory size={20} />,
    color: '#8B5CF6',
  },
] as const;

const STEPS = ['Ваш бизнес', 'Режим Kort', 'Быстрый старт'];

const QUICK_LINKS: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
  path: string;
}> = [
  {
    icon: UserPlus,
    title: 'Добавьте первого клиента',
    desc: 'Создайте карточку вручную или перенесите базу из Excel.',
    path: '/customers',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Создайте первую сделку',
    desc: 'Сразу перенесите первый входящий запрос в рабочую воронку.',
    path: '/deals',
  },
  {
    icon: FileSpreadsheet,
    title: 'Импорт из Excel',
    desc: 'Загрузите существующую базу и продолжайте работу без пустых экранов.',
    path: '/imports',
  },
] as const;

export default function OnboardingPage() {
  useDocumentTitle('Начало работы');

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setOrg = useAuthStore((state) => state.setOrg);
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [companySize, setSize] = useState('');
  const [selectedMode, setMode] = useState('advanced');

  const setupMutation = useMutation({
    mutationFn: ({
      nextPath,
      ...data
    }: {
      nextPath: string;
      mode: string;
      industry: string;
      company_size: string;
      onboarding_completed: boolean;
    }) => api.patch('/organization/', data),
    onSuccess: (updated: any, variables) => {
      setOrg({ onboarding_completed: true, ...(updated ?? {}) });
      const modeLabel = MODES.find((item) => item.mode === selectedMode)?.title ?? 'Ваш режим';
      const businessLabel = BUSINESS_TYPES.find((item) => item.value === industry)?.label ?? 'ваш бизнес';
      const nextPath = variables?.nextPath ?? '/';
      const handoffMap: Record<string, string> = {
        '/': `Онбординг завершён · ${modeLabel} для направления «${businessLabel}» уже собран в Kort Home. Сначала проверьте входящий поток, затем создайте первую рабочую сущность.`,
        '/customers': 'Онбординг завершён · начните с клиентов, чтобы быстро превратить контекст бизнеса в рабочую базу.',
        '/deals': 'Онбординг завершён · переходите к первой сделке, пока логика продаж ещё свежа после настройки.',
        '/imports': 'Онбординг завершён · загрузите базу и сразу перенесите запуск в живой операционный контур.',
      };
      setProductMoment(handoffMap[nextPath] ?? handoffMap['/']);
      toast.success('Настройки сохранены');
      navigate(nextPath, { replace: true });
    },
  });

  const canNext = step === 0 ? industry !== '' && companySize !== '' : true;
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

  function dotClass(index: number) {
    return index < step ? s.done : index === step ? s.active : s.pending;
  }

  function labelClass(index: number) {
    return index === step ? s.active : s.other;
  }

  function connClass(index: number) {
    return index < step ? s.done : s.pending;
  }

  return (
    <div className={s.page}>
      <motion.div className={s.logoRow} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <KortLogo size={40} />
        <div className={s.logoCopy}>
          <span className={s.logoEyebrow}>Операционный запуск</span>
          <span className={s.logoLabel}>Kort</span>
        </div>
      </motion.div>

      <div className={s.steps}>
        {STEPS.map((label, index) => (
          <div key={label} className={s.stepItem}>
            <div className={s.stepDotWrap}>
              <div className={`${s.stepDot} ${dotClass(index)}`}>
                {index < step ? (
                  <CheckCircle2 size={14} color="currentColor" />
                ) : (
                  <span className={`${s.stepDotNum} ${dotClass(index)}`}>{index + 1}</span>
                )}
              </div>
              <span className={`${s.stepLabel} ${labelClass(index)}`}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className={`${s.stepConnector} ${connClass(index)}`} />}
          </div>
        ))}
      </div>

      <motion.div
        key={step}
        className={`${s.card} ${cardClass}`}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
      >
        {step === 0 && (
          <>
            <div className={s.sectionIntro}>
              <span className="kort-signature-intro">
                <Sparkles size={12} />
                <strong>Первый контур</strong>
                Соберём правильную стартовую конфигурацию.
              </span>
            </div>

            <h2 className={s.sectionTitle}>Расскажите о вашем бизнесе</h2>
            <p className={s.sectionDesc}>
              Kort не привязывает интерфейс к одному шаблону. Нужен только стартовый контекст,
              чтобы собрать для вас точный рабочий контур без пустых экранов и лишних шагов.
            </p>

            <p className={s.subLabel}>Тип бизнеса</p>
            <div className={s.industryGrid}>
              {BUSINESS_TYPES.map((item) => (
                <motion.button
                  key={item.value}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setIndustry(item.value)}
                  className={`${s.industryBtn} ${industry === item.value ? s.selected : ''}`}
                >
                  <span className={s.industryIcon}>{item.icon}</span>
                  <span className={s.industryMeta}>
                    <span className={`${s.industryLabel} ${industry === item.value ? s.selected : s.default}`}>
                      {item.label}
                    </span>
                    <span className={s.industryDesc}>{item.description}</span>
                  </span>
                </motion.button>
              ))}
            </div>

            <p className={s.subLabel}>Размер команды</p>
            <div className={s.sizeGrid}>
              {SIZES.map((item) => (
                <motion.button
                  key={item.value}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSize(item.value)}
                  className={`${s.sizeBtn} ${companySize === item.value ? s.selected : s.default}`}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className={s.sectionIntro}>
              <span className="kort-signature-intro">
                <ShieldCheck size={12} />
                <strong>Режим продукта</strong>
                Выберите глубину процессов на старте.
              </span>
            </div>

            <h2 className={s.sectionTitle}>Выберите режим Kort</h2>
            <p className={s.sectionDesc}>
              Режим можно изменить позже в настройках. Сейчас важно выбрать плотность контуров,
              с которой продукт откроется для вашей команды.
            </p>

            <div className={s.planGrid}>
              {MODES.map((mode) => (
                <motion.button
                  key={mode.mode}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setMode(mode.mode)}
                  className={s.planCard}
                  style={
                    {
                      '--plan-color': mode.color,
                      '--plan-card-border': selectedMode === mode.mode ? mode.color : 'var(--brand-panel-border)',
                      '--plan-card-bg':
                        selectedMode === mode.mode
                          ? `color-mix(in srgb, ${mode.color} 10%, var(--bg-surface-elevated))`
                          : 'var(--bg-surface)',
                      '--plan-card-ring':
                        selectedMode === mode.mode ? `0 0 0 3px color-mix(in srgb, ${mode.color} 22%, transparent)` : 'none',
                    } as CSSProperties
                  }
                >
                  <div className={s.planIcon}>{mode.icon}</div>
                  <div className={s.planTitle}>{mode.title}</div>
                  <div className={s.planSubtitle}>{mode.subtitle}</div>
                  <div className={s.planFeatures}>
                    {mode.features.map((feature) => (
                      <div key={feature} className={s.planFeature}>
                        <span className={s.planFeatureDot}>
                          <CheckCircle2 size={9} color="#fff" />
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <motion.div className={s.successStep} variants={successBurst} initial="hidden" animate="visible">
              <div className={s.successIcon}>
                <CheckCircle2 size={46} />
              </div>
              <h2 className={s.successTitle}>Вы готовы к работе</h2>
              <p className={s.successDesc}>
                Привет, {user?.full_name?.split(' ')[0]}! Kort настроен и уже готов к первому полезному действию.
              </p>
            </motion.div>

            <div className={s.completionActions}>
              <Button variant="secondary" size="sm" icon={<LayoutDashboard size={14} />} onClick={() => handleFinish('/')}>
                Открыть Kort Home
              </Button>
              <span className={s.completionHint}>Или сразу перейдите в первый рабочий сценарий:</span>
            </div>

            <div className={s.quickLinks}>
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.title}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleQuickLink(item.path)}
                    className={s.quickLinkBtn}
                  >
                    <span className={s.quickLinkIcon}>
                      <Icon size={18} />
                    </span>
                    <div className={s.quickLinkBody}>
                      <div className={s.quickLinkTitle}>{item.title}</div>
                      <div className={s.quickLinkDesc}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} className={s.quickLinkChevron} />
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        <div className={s.navRow}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={() => step > 0 && setStep(step - 1)}
            className={step === 0 ? s.navBackHidden : undefined}
          >
            Назад
          </Button>

          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} iconRight={<ChevronRight size={14} />} onClick={() => setStep(step + 1)}>
              Продолжить
            </Button>
          ) : (
            <Button loading={setupMutation.isPending} onClick={() => handleFinish('/')}>
              Начать работу
            </Button>
          )}
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
