import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Building2, ChevronRight, Eye, EyeOff, KeyRound, User, X } from 'lucide-react';
import { MOCK_AUTH_RESPONSE } from '../../shared/api/mock-data';
import { useAuthStore } from '../../shared/stores/auth';
import { usePinStore } from '../../shared/stores/pin';
import styles from './AuthModal.module.css';

type Step = 'login' | 'pin' | 'choose-type' | 'employee' | 'company';

type OrgType = 'ИП' | 'ТОО' | 'АО';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  initialStep?: Step;
}

const ORG_TYPES: OrgType[] = ['ИП', 'ТОО', 'АО'];
const COMPANY_ROLES = ['Админ', 'Бухгалтер', 'Менеджер'] as const;

const OVERLAY = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.93, y: 22 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.96, y: 14, transition: { duration: 0.2 } },
};

/* ── Carousel Slides ── */

const NET_NODES = [
  { cx: 50, cy: 28, label: 'Клиенты' },
  { cx: 175, cy: 22, label: 'Сделки' },
  { cx: 120, cy: 70, label: 'Задачи' },
  { cx: 26, cy: 105, label: 'Лиды' },
  { cx: 215, cy: 95, label: 'Отчёты' },
  { cx: 68, cy: 152, label: 'KPI' },
  { cx: 180, cy: 148, label: 'Команда' },
];

const NET_EDGES: [number, number][] = [
  [0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 6], [5, 6], [0, 1],
];

function SlideNetwork() {
  return (
    <div className={styles.slideInner}>
      <svg viewBox="0 0 240 175" className={styles.slideCanvas}>
        <defs>
          <filter id="nGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {NET_EDGES.map(([from, to], i) => (
          <motion.path
            key={i}
            d={`M${NET_NODES[from].cx},${NET_NODES[from].cy} L${NET_NODES[to].cx},${NET_NODES[to].cy}`}
            stroke="rgba(80,125,185,0.18)"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}

        {NET_NODES.map((n, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.25 + i * 0.1 }}
          >
            <circle cx={n.cx} cy={n.cy} r={i === 2 ? 5 : 3.5} fill="rgba(90,150,225,0.65)" filter="url(#nGlow)" />
            <text x={n.cx} y={n.cy + (i < 3 ? -10 : 14)} textAnchor="middle" fill="rgba(145,165,200,0.58)" fontSize="9.5" fontWeight="500">{n.label}</text>
          </motion.g>
        ))}

        <motion.circle
          r="1.5" fill="rgba(120,175,245,0.55)"
          animate={{ cx: [50, 120], cy: [28, 70], opacity: [0, 0.7, 0.7, 0] }}
          transition={{ duration: 2.5, ease: 'linear', repeat: Infinity, repeatDelay: 4, times: [0, 0.1, 0.9, 1] }}
        />
        <motion.circle
          r="1.5" fill="rgba(120,175,245,0.55)"
          animate={{ cx: [120, 180], cy: [70, 148], opacity: [0, 0.7, 0.7, 0] }}
          transition={{ duration: 2.2, ease: 'linear', repeat: Infinity, repeatDelay: 5, delay: 1.8, times: [0, 0.1, 0.9, 1] }}
        />
      </svg>
      <div className={styles.slideCaption}>
        <div className={styles.slideTitle}>Единое пространство</div>
        <div className={styles.slideSubtitle}>Все бизнес-процессы связаны</div>
      </div>
    </div>
  );
}

const BAR_DATA = [
  { x: 28, h: 48 }, { x: 62, h: 72 }, { x: 96, h: 60 }, { x: 130, h: 92 }, { x: 164, h: 105 },
];

function SlideAnalytics() {
  return (
    <div className={styles.slideInner}>
      <svg viewBox="0 0 240 175" className={styles.slideCanvas}>
        {[50, 80, 110, 140].map(y => (
          <line key={y} x1="20" y1={y} x2="220" y2={y} stroke="rgba(70,95,130,0.08)" strokeWidth="0.5" />
        ))}

        {BAR_DATA.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x} width={22} rx={3}
            fill="rgba(70,125,195,0.22)"
            initial={{ y: 155, height: 0 }}
            animate={{ y: 155 - b.h, height: b.h }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        <motion.path
          d="M39,107 L73,83 L107,92 L141,63 L175,48 L209,55"
          fill="none"
          stroke="rgba(110,170,240,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />

        {BAR_DATA.map((b, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={b.x + 11} cy={[107, 83, 92, 63, 48][i]}
            r="2.5"
            fill="rgba(120,175,245,0.7)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.25 }}
          />
        ))}

        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.35 }}>
          <text x="218" y="38" textAnchor="end" fill="rgba(110,170,240,0.65)" fontSize="13" fontWeight="600">+24%</text>
          <text x="218" y="50" textAnchor="end" fill="rgba(135,155,185,0.45)" fontSize="8.5">рост</text>
        </motion.g>
      </svg>
      <div className={styles.slideCaption}>
        <div className={styles.slideTitle}>Аналитика реального времени</div>
        <div className={styles.slideSubtitle}>KPI, метрики и прогнозы</div>
      </div>
    </div>
  );
}

const PIPE_STAGES = [
  { cx: 35, label: 'Лид' },
  { cx: 95, label: 'Квалификация' },
  { cx: 165, label: 'Переговоры' },
  { cx: 225, label: 'Закрытие' },
];

function SlidePipeline() {
  return (
    <div className={styles.slideInner}>
      <svg viewBox="0 0 260 160" className={styles.slideCanvas}>
        <motion.path
          d={`M${PIPE_STAGES[0].cx},80 L${PIPE_STAGES[3].cx},80`}
          stroke="rgba(70,110,160,0.18)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />

        {PIPE_STAGES.map((s, i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.3 }}>
            <circle cx={s.cx} cy={80} r="10" fill="rgba(75,120,185,0.06)" stroke="rgba(80,130,195,0.2)" strokeWidth="1.2" />
            <circle cx={s.cx} cy={80} r="3" fill="rgba(95,155,225,0.55)" />
            <text x={s.cx} y={104} textAnchor="middle" fill="rgba(145,165,195,0.55)" fontSize="9" fontWeight="500">{s.label}</text>
          </motion.g>
        ))}

        <motion.circle
          cy={80} r="3.5"
          fill="rgba(120,180,250,0.75)"
          initial={{ cx: PIPE_STAGES[0].cx, opacity: 0 }}
          animate={{
            cx: [PIPE_STAGES[0].cx, PIPE_STAGES[1].cx, PIPE_STAGES[2].cx, PIPE_STAGES[3].cx],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2, delay: 1, times: [0, 0.33, 0.66, 1] }}
        />

        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.35 }}>
          <text x="130" y="135" textAnchor="middle" fill="rgba(110,165,235,0.5)" fontSize="10" fontWeight="500">87% конверсия</text>
        </motion.g>
      </svg>
      <div className={styles.slideCaption}>
        <div className={styles.slideTitle}>Воронка продаж</div>
        <div className={styles.slideSubtitle}>Контроль каждого этапа сделки</div>
      </div>
    </div>
  );
}

/* ── Auth Helpers ── */

function trimPhone(value: string) {
  return value.replace(/[^\d+()\-\s]/g, '').slice(0, 22);
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button type="button" className={styles.socialButton} aria-label={`Продолжить через ${label}`}>
      <span className={styles.socialIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordField}>
      <input
        className={styles.input}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={() => setVisible((state) => !state)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/* ── PIN Step ── */

function StepPin({ onSuccess, onUsePassword }: { onSuccess: () => void; onUsePassword: () => void }) {
  const storedPin = usePinStore(s => s.pin);
  const user = useAuthStore(s => s.user);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const PIN_LENGTH = storedPin?.length ?? 4;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const verify = (value: string) => {
    if (value === storedPin) {
      onSuccess();
    } else {
      setShake(true);
      setError('Неверный PIN-код. Попробуйте ещё раз.');
      setDigits('');
      setTimeout(() => { setShake(false); inputRef.current?.focus(); }, 500);
    }
  };

  const handleChange = (e: { target: HTMLInputElement }) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setDigits(val);
    setError('');
    if (val.length === PIN_LENGTH) verify(val);
  };

  const firstName = user?.full_name?.split(' ')[0] ?? '';

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>
          {firstName ? `Привет, ${firstName}` : 'Введите PIN-код'}
        </h2>
        <p className={styles.subtitle}>
          Используйте PIN-код для быстрого входа в рабочее пространство.
        </p>
      </div>

      <div
        className={styles.pinArea}
        onClick={() => inputRef.current?.focus()}
        role="button"
        tabIndex={-1}
        aria-label="Поле ввода PIN-кода"
      >
        <motion.div
          className={styles.pinDots}
          animate={shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
          transition={{ duration: 0.42 }}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <div
              key={i}
              className={`${styles.pinDot} ${digits.length > i ? styles.pinDotFilled : ''}`}
            />
          ))}
        </motion.div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={digits}
          onChange={handleChange}
          className={styles.pinHiddenInput}
          aria-label="PIN-код"
        />
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <button type="button" className={styles.linkButton} onClick={onUsePassword}>
        Войти с паролем →
      </button>
    </div>
  );
}

/* ── Auth Steps ── */

function StepLogin({
  onCreateAccount,
  onSuccess,
  onPinStep,
}: {
  onCreateAccount: () => void;
  onSuccess: () => void;
  onPinStep: () => void;
}) {
  const setAuth = useAuthStore(s => s.setAuth);
  const trustDevice = usePinStore(s => s.trustDevice);
  const { pin, isTrustedDevice } = usePinStore();
  const user = useAuthStore(s => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pinInfo, setPinInfo] = useState('');

  const submit = () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('Введите эл. почту');
      return;
    }

    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setAuth(
      { ...MOCK_AUTH_RESPONSE.user, email: normalizedEmail },
      MOCK_AUTH_RESPONSE.org,
      MOCK_AUTH_RESPONSE.access,
      MOCK_AUTH_RESPONSE.refresh,
      MOCK_AUTH_RESPONSE.capabilities,
      MOCK_AUTH_RESPONSE.role,
    );
    trustDevice();
    setError('');
    onSuccess();
  };

  const handlePinClick = () => {
    setPinInfo('');
    if (pin && isTrustedDevice && user) {
      onPinStep();
    } else if (!user && !isTrustedDevice) {
      setPinInfo('Сначала создайте аккаунт или войдите через логин и пароль.');
    } else if (!isTrustedDevice) {
      setPinInfo('PIN-код доступен только с устройства, где ранее выполнялся вход.');
    } else {
      setPinInfo('Установите PIN-код в разделе «Настройки → Безопасность».');
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Вход в KORT</h2>
        <p className={styles.subtitle}>Разблокируйте рабочее пространство и продолжите работу.</p>
      </div>

      <div className={styles.socialRow}>
        <SocialButton
          label="Google"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          }
        />
        <SocialButton
          label="Apple"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.29.07 2.18.74 2.93.76.94-.19 1.84-.88 3.01-.79 1.44.12 2.51.71 3.2 1.83-3.03 1.93-2.3 5.93.77 7.08-.62 1.39-1.34 2.74-1.91 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          }
        />
        <SocialButton
          label="Microsoft"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
              <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
            </svg>
          }
        />
      </div>

      <div className={styles.divider}><span>или через рабочий аккаунт</span></div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ display: 'contents' }}
      >
        <div className={styles.formFields}>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Эл. почта"
            autoComplete="email"
            autoFocus
          />
          <PasswordField value={password} onChange={setPassword} placeholder="Пароль" autoComplete="current-password" />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button type="submit" className={styles.primaryButton}>
          Войти <ChevronRight size={16} />
        </button>
      </form>

      <button type="button" className={styles.pinButton} onClick={handlePinClick}>
        <KeyRound size={15} />
        Войти по PIN-коду
      </button>

      {pinInfo && (
        <div className={styles.pinInfo}>{pinInfo}</div>
      )}

      <div className={styles.footerRow}>
        <span>Нет аккаунта?</span>
        <button type="button" className={styles.linkButton} onClick={onCreateAccount}>
          Создать аккаунт
        </button>
      </div>
    </div>
  );
}

function StepChooseType({ onSelect }: { onSelect: (value: 'employee' | 'company') => void }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Создание аккаунта</h2>
        <p className={styles.subtitle}>Выберите сценарий регистрации.</p>
      </div>

      <div className={styles.typeGrid}>
        <button type="button" className={styles.typeCard} onClick={() => onSelect('employee')}>
          <span className={styles.typeIcon}><User size={22} /></span>
          <span className={styles.typeLabel}>Сотрудник</span>
          <span className={styles.typeDesc}>ФИО, телефон, почта и пароль.</span>
        </button>
        <button type="button" className={styles.typeCard} onClick={() => onSelect('company')}>
          <span className={styles.typeIcon}><Building2 size={22} /></span>
          <span className={styles.typeLabel}>Компания</span>
          <span className={styles.typeDesc}>Юридическая форма, БИН/ИИН, роль и контакты.</span>
        </button>
      </div>
    </div>
  );
}

function StepEmployee({ onSuccess }: { onSuccess: () => void }) {
  const setAuth = useAuthStore(s => s.setAuth);
  const trustDevice = usePinStore(s => s.trustDevice);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const normalizedName = normalizeName(fullName);
    const normalizedEmail = email.trim();

    if (!normalizedName) { setError('Введите ФИО'); return; }
    if (!phone.trim()) { setError('Введите номер телефона'); return; }
    if (!normalizedEmail) { setError('Введите эл. почту'); return; }
    if (password.length < 6) { setError('Пароль должен содержать не менее 6 символов'); return; }
    if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }

    setAuth(
      {
        ...MOCK_AUTH_RESPONSE.user,
        id: `employee-${Date.now()}`,
        full_name: normalizedName,
        phone: phone.trim(),
        email: normalizedEmail,
      },
      { ...MOCK_AUTH_RESPONSE.org, name: 'Личный рабочий аккаунт', slug: 'personal-workspace' },
      MOCK_AUTH_RESPONSE.access,
      MOCK_AUTH_RESPONSE.refresh,
      MOCK_AUTH_RESPONSE.capabilities,
      'manager',
    );
    trustDevice();
    setError('');
    onSuccess();
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Регистрация сотрудника</h2>
        <p className={styles.subtitle}>Создайте доступ для сотрудника без лишних шагов.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'contents' }}>
        <div className={styles.formFields}>
          <input className={styles.input} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО" autoFocus />
          <input className={styles.input} type="tel" value={phone} onChange={(e) => setPhone(trimPhone(e.target.value))} placeholder="Номер телефона" autoComplete="tel" />
          <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Эл. почта" autoComplete="email" />
          <PasswordField value={password} onChange={setPassword} placeholder="Пароль, минимум 6 символов" autoComplete="new-password" />
          <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Повторите пароль" autoComplete="new-password" />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button type="submit" className={styles.primaryButton}>
          Создать аккаунт <ChevronRight size={16} />
        </button>
      </form>
    </div>
  );
}

function StepCompany({ onSuccess }: { onSuccess: () => void }) {
  const setAuth = useAuthStore(s => s.setAuth);
  const trustDevice = usePinStore(s => s.trustDevice);
  const [orgType, setOrgType] = useState<OrgType>('ТОО');
  const [companyName, setCompanyName] = useState('');
  const [iinBin, setIinBin] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const legalName = useMemo(() => {
    const name = normalizeName(companyName);
    return name ? `${orgType} ${name}` : '';
  }, [companyName, orgType]);

  const submit = () => {
    const normalizedEmail = email.trim();

    if (!normalizeName(companyName)) { setError('Введите название компании'); return; }
    if (iinBin.length < 12) { setError('Укажите корректный БИН/ИИН из 12 цифр'); return; }
    if (!role) { setError('Выберите должность'); return; }
    if (!phone.trim()) { setError('Введите рабочий номер телефона'); return; }
    if (!normalizedEmail) { setError('Введите рабочую эл. почту'); return; }
    if (password.length < 6) { setError('Пароль должен содержать не менее 6 символов'); return; }

    setAuth(
      {
        ...MOCK_AUTH_RESPONSE.user,
        id: `company-owner-${Date.now()}`,
        full_name: role,
        phone: phone.trim(),
        email: normalizedEmail,
      },
      {
        ...MOCK_AUTH_RESPONSE.org,
        name: legalName,
        slug: legalName.toLowerCase().replace(/\s+/g, '-'),
      },
      MOCK_AUTH_RESPONSE.access,
      MOCK_AUTH_RESPONSE.refresh,
      MOCK_AUTH_RESPONSE.capabilities,
      'owner',
    );
    trustDevice();
    setError('');
    onSuccess();
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Регистрация компании</h2>
        <p className={styles.subtitle}>Юридическая форма автоматически дописывается к названию организации.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'contents' }}>
        <div className={styles.formFields}>
          <div className={styles.orgTypeRow}>
            {ORG_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={[styles.orgTypeButton, orgType === value ? styles.orgTypeButtonActive : ''].join(' ')}
                onClick={() => setOrgType(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <div className={styles.companyNameBlock}>
            <input
              className={styles.input}
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Название компании"
              autoFocus
            />
            <div className={styles.legalPreview}>{legalName || `${orgType} ...`}</div>
          </div>

          <input
            className={styles.input}
            type="text"
            value={iinBin}
            onChange={(e) => setIinBin(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="БИН / ИИН"
            inputMode="numeric"
          />

          <div className={styles.selectWrap}>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="" disabled>Выберите должность</option>
              {COMPANY_ROLES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <input className={styles.input} type="tel" value={phone} onChange={(e) => setPhone(trimPhone(e.target.value))} placeholder="Рабочий номер" autoComplete="tel" />
          <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Рабочая эл. почта" autoComplete="email" />
          <PasswordField value={password} onChange={setPassword} placeholder="Пароль, минимум 6 символов" autoComplete="new-password" />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button type="submit" className={styles.primaryButton}>
          Зарегистрировать компанию <ChevronRight size={16} />
        </button>
      </form>
    </div>
  );
}

/* ── Main Modal ── */

const SLIDE_COUNT = 3;
const SLIDE_INTERVAL = 5000;

export function AuthModal({ open, onClose, onAuthSuccess, initialStep }: AuthModalProps) {
  const [step, setStep] = useState<Step>(initialStep ?? 'login');
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setInterval>>();

  const resetSlideTimer = useCallback(() => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => {
      setSlide((prev) => (prev + 1) % SLIDE_COUNT);
    }, SLIDE_INTERVAL);
  }, []);

  useEffect(() => {
    if (!open) {
      if (slideTimer.current) clearInterval(slideTimer.current);
      return;
    }
    setStep(initialStep ?? 'login');
    setSlide(0);
    resetSlideTimer();
    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current);
    };
  }, [open, resetSlideTimer, initialStep]);

  const goToSlide = useCallback((index: number) => {
    setSlide(index);
    resetSlideTimer();
  }, [resetSlideTimer]);

  const goBack = () => {
    if (step === 'pin') { setStep('login'); return; }
    if (step === 'choose-type') { setStep('login'); return; }
    if (step === 'employee' || step === 'company') { setStep('choose-type'); }
  };

  const showBack = step !== 'login';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          variants={OVERLAY}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div className={styles.panel} variants={PANEL} initial="hidden" animate="visible" exit="exit">
            {/* Brand side — carousel */}
            <aside className={styles.brandSide}>
              <div className={styles.brandOrb1} />
              <div className={styles.brandOrb2} />

              <div className={styles.carousel}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide}
                    className={styles.carouselSlide}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                  >
                    {slide === 0 && <SlideNetwork />}
                    {slide === 1 && <SlideAnalytics />}
                    {slide === 2 && <SlidePipeline />}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className={styles.carouselDots}>
                {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.carouselDot} ${i === slide ? styles.carouselDotActive : ''}`}
                    onClick={() => goToSlide(i)}
                    aria-label={`Слайд ${i + 1}`}
                  />
                ))}
              </div>
            </aside>

            {/* Form side */}
            <div className={styles.formSide}>
              <div className={styles.formHeader}>
                <div className={styles.headerLeft}>
                  <AnimatePresence>
                    {showBack && (
                      <motion.button
                        type="button"
                        className={styles.backButton}
                        onClick={goBack}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.16 }}
                      >
                        <ArrowLeft size={16} />
                        <span>Назад</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
                  <X size={18} />
                </button>
              </div>

              <div className={styles.formViewport}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step === 'login' && (
                      <StepLogin
                        onCreateAccount={() => setStep('choose-type')}
                        onSuccess={onAuthSuccess}
                        onPinStep={() => setStep('pin')}
                      />
                    )}
                    {step === 'pin' && (
                      <StepPin
                        onSuccess={onAuthSuccess}
                        onUsePassword={() => setStep('login')}
                      />
                    )}
                    {step === 'choose-type' && <StepChooseType onSelect={(value) => setStep(value)} />}
                    {step === 'employee' && <StepEmployee onSuccess={onAuthSuccess} />}
                    {step === 'company' && <StepCompany onSuccess={onAuthSuccess} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
