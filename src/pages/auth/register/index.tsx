import { useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import {
  CheckCircle2, Users, Zap, Factory,
  ChevronRight, ArrowLeft, Eye, EyeOff, Check,
} from 'lucide-react';
import s from './Register.module.css';

/* ── Types ──────────────────────────────────────────────────── */
interface RegisterForm {
  organization_name: string;
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

/* ── Plan config ─────────────────────────────────────────────── */
const MODES = [
  {
    mode: 'basic',
    title: 'Базовый',
    subtitle: 'Для запуска и первых процессов',
    icon: <Users size={20} />,
    color: '#3B82F6',
    features: ['Клиенты и контакты', 'Сделки и воронка', 'Задачи и заметки', 'Простые отчёты'],
  },
  {
    mode: 'advanced',
    title: 'Продвинутый',
    subtitle: 'Для команды с рабочим ритмом',
    icon: <Zap size={20} />,
    color: '#D97706',
    features: ['Всё из Базового', 'Роли сотрудников', 'Автоматизации', 'Расширенная аналитика', 'Кастомные поля'],
    recommended: true,
  },
  {
    mode: 'industrial',
    title: 'Промышленный',
    subtitle: 'Для сложных процессов и контроля',
    icon: <Factory size={20} />,
    color: '#8B5CF6',
    features: ['Всё из Продвинутого', 'API доступ', 'Аудит действий', 'SLA и очереди', 'Мультифилиальность'],
  },
];

const STEPS = ['Аккаунт', 'Выбор плана'];

/* ── Page ────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const navigate     = useNavigate();
  const setAuth      = useAuthStore((s) => s.setAuth);
  const [regMode, setRegMode]     = useState<'company' | 'employee' | null>(null);
  const [step, setStep]           = useState(0);
  const [selectedMode, setMode]   = useState('advanced');
  const [showPwd, setShowPwd]     = useState(false);

  const {
    register, handleSubmit, getValues,
    formState: { isSubmitting, errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res: any = await api.post('/auth/register', {
        ...data,
        email: data.email.trim().toLowerCase(),
        mode: selectedMode,
      });
      setAuth(res.user, res.org, res.access, res.refresh, res.capabilities ?? [], res.role ?? 'owner');
      navigate('/onboarding', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка регистрации');
      setStep(0);
    }
  };

  const goToStep1 = () => {
    const v = getValues();
    if (!v.organization_name || !v.full_name || !v.email || !v.password) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    if (v.password.length < 8) {
      toast.error('Пароль минимум 8 символов');
      return;
    }
    setStep(1);
  };

  // ── Registration type selector ───────────────────────────────
  if (!regMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <div style={{ textAlign:'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color:'var(--text-primary)', marginBottom: 8 }}>
            Добро пожаловать в Kort
          </div>
          <div style={{ fontSize: 14, color:'var(--text-secondary)' }}>
            Выберите, как вы будете использовать платформу
          </div>
        </div>
        <div style={{ display:'grid', gap: 12 }}>
          <button
            onClick={() => setRegMode('company')}
            style={{
              display:'flex', alignItems:'center', gap: 16, padding:'18px 20px',
              borderRadius: 16, border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.04)', cursor:'pointer', textAlign:'left',
              transition:'all 160ms',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(160,104,56,0.5)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(160,104,56,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Factory size={20} color="rgba(210,160,90,0.9)" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Создать компанию</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>
                Регистрируете организацию и настраиваете CRM под себя
              </div>
            </div>
          </button>

          <button
            onClick={() => setRegMode('employee')}
            style={{
              display:'flex', alignItems:'center', gap: 16, padding:'18px 20px',
              borderRadius: 16, border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.04)', cursor:'pointer', textAlign:'left',
              transition:'all 160ms',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Users size={20} color="rgba(147,197,253,0.9)" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Зарегистрироваться как сотрудник</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>
                Присоединяетесь к существующей компании по приглашению
              </div>
            </div>
          </button>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-tertiary)' }}>
          Уже есть аккаунт? <Link to="/auth/login" style={{ color:'rgba(210,160,90,0.8)', fontWeight:600 }}>Войти</Link>
        </div>
      </motion.div>
    );
  }

  // ── Employee registration — simple join flow ─────────────────
  if (regMode === 'employee') {
    return (
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}>
        <button
          onClick={() => setRegMode(null)}
          style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', fontSize:13 }}
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Вход как сотрудник</div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:22 }}>
          Для подключения к компании вам нужна ссылка-приглашение от администратора.
          Она отправляется из раздела «Настройки → Команда».
        </div>
        <div style={{ padding:'16px', borderRadius:14, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.07)', fontSize:13, color:'rgba(253,211,77,0.85)', lineHeight:1.6 }}>
          Попросите руководителя отправить вам приглашение на email. После перехода по ссылке ваш аккаунт будет создан автоматически.
        </div>
        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-tertiary)' }}>
          <Link to="/auth/login" style={{ color:'rgba(210,160,90,0.8)', fontWeight:600 }}>Войти в существующий аккаунт</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <button
        onClick={() => setRegMode(null)}
        style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', fontSize:13 }}
      >
        <ArrowLeft size={14} /> Назад
      </button>
      {/* Step indicator */}
      <div className={s.steps}>
        {STEPS.map((label, i) => (
          <div key={i} className={s.stepItem}>
            <div className={`${s.stepDot} ${i === step ? s.active : i < step ? s.done : ''}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`${s.stepLabel} ${i === step ? s.active : ''}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={s.stepConnector} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0 — account details */}
        {step === 0 && (
          <motion.div key="step0"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className={s.form}>
              <div className={s.field}>
                <label className={s.label}>Название организации *</label>
                <input
                  {...register('organization_name', { required: true })}
                  placeholder="ТОО Ромашка"
                  className={`kort-input ${errors.organization_name ? s.inputError : ''}`}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Ваше имя *</label>
                <input
                  {...register('full_name', { required: true })}
                  placeholder="Имя Фамилия"
                  className={`kort-input ${errors.full_name ? s.inputError : ''}`}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Email *</label>
                <input
                  {...register('email', { required: true })}
                  type="email"
                  placeholder="you@company.com"
                  className={`kort-input ${errors.email ? s.inputError : ''}`}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Телефон</label>
                <input {...register('phone')} type="tel" placeholder="+7 (000) 000-00-00" className="kort-input" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Пароль *</label>
                <div className={s.inputWrap}>
                  <input
                    {...register('password', { required: true, minLength: 8 })}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    className={`kort-input ${s.passwordInput} ${errors.password ? s.inputError : ''}`}
                  />
                  <button type="button" className={s.pwdToggle} onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={goToStep1}
                className={s.ctaBtn}
              >
                Продолжить <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 1 — plan selection */}
        {step === 1 && (
          <motion.form key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit(onSubmit)}>
            <p className={s.planHint}>Выберите режим Kort. Вы сможете изменить его позже.</p>

            <div className={s.planGrid}>
              {MODES.map((m) => (
                <motion.button
                  key={m.mode}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode(m.mode)}
                  className={s.planCard}
                  style={{
                    '--plan-color': m.color,
                    '--plan-card-border': selectedMode === m.mode ? m.color : 'var(--border-default)',
                    '--plan-card-bg': selectedMode === m.mode ? `${m.color}0D` : 'var(--bg-surface)',
                    '--plan-card-ring': selectedMode === m.mode ? `0 0 0 3px ${m.color}22` : 'none',
                  } as CSSProperties}
                >
                  {m.recommended && (
                    <div className={s.planBadge}>Рекомендуем</div>
                  )}
                  <div className={s.planIcon}>
                    {m.icon}
                  </div>
                  <div className={s.planTitle}>{m.title}</div>
                  <div className={s.planSubtitle}>{m.subtitle}</div>
                  {m.features.map((f) => (
                    <div key={f} className={s.planFeature}>
                      <CheckCircle2 size={11} color={m.color} />
                      {f}
                    </div>
                  ))}
                </motion.button>
              ))}
            </div>

            <div className={s.btnRow}>
              <button type="button" onClick={() => setStep(0)} className={s.backBtn}>
                <ArrowLeft size={14} /> Назад
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className={`${s.ctaBtn} ${s.btnRowFlex}`}
              >
                {isSubmitting ? 'Создаём аккаунт...' : 'Начать работу →'}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p className={s.footerLink}>
        Уже есть аккаунт?{' '}
        <Link to="/auth/login">Войти</Link>
      </p>
    </motion.div>
  );
}
