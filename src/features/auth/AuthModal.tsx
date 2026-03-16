import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronRight, Eye, EyeOff, User, X } from 'lucide-react';
import { MOCK_AUTH_RESPONSE } from '../../shared/api/mock-data';
import { useAuthStore } from '../../shared/stores/auth';
import styles from './AuthModal.module.css';

type Step = 'login' | 'choose-type' | 'employee' | 'company';

type OrgType = 'ИП' | 'ТОО' | 'АО';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

const ORG_TYPES: OrgType[] = ['ИП', 'ТОО', 'АО'];
const COMPANY_ROLES = ['Директор', 'Бухгалтер', 'Менеджер'] as const;
const STEP_ORDER: Step[] = ['login', 'choose-type', 'employee', 'company'];

const OVERLAY = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.18 } },
};

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

function ModalProgress({ step }: { step: Step }) {
  const activeIndex = STEP_ORDER.indexOf(step);

  return (
    <div className={styles.progress} aria-hidden="true">
      {[0, 1, 2].map((index) => {
        const stateClass =
          index === activeIndex || (index === 2 && activeIndex === 3)
            ? styles.progressActive
            : index < activeIndex
              ? styles.progressDone
              : '';

        return <span key={index} className={[styles.progressDot, stateClass].join(' ')} />;
      })}
    </div>
  );
}

function StepLogin({ onCreateAccount, onSuccess }: { onCreateAccount: () => void; onSuccess: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
    setError('');
    onSuccess();
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

      <div className={styles.formFields}>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Эл. почта"
          autoComplete="email"
        />
        <PasswordField value={password} onChange={setPassword} placeholder="Пароль" autoComplete="current-password" />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="button" className={styles.primaryButton} onClick={submit}>
        Войти <ChevronRight size={16} />
      </button>

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
        <p className={styles.subtitle}>Выберите сценарий регистрации. Внутри модального окна оставлен запас под будущие внешние провайдеры.</p>
      </div>

      <div className={styles.typeGrid}>
        <button type="button" className={styles.typeCard} onClick={() => onSelect('employee')}>
          <span className={styles.typeIcon}><User size={24} /></span>
          <span className={styles.typeTitle}>Сотрудник</span>
          <span className={styles.typeText}>ФИО, телефон, почта и пароль.</span>
        </button>
        <button type="button" className={styles.typeCard} onClick={() => onSelect('company')}>
          <span className={styles.typeIcon}><Building2 size={24} /></span>
          <span className={styles.typeTitle}>Компания</span>
          <span className={styles.typeText}>Юридическая форма, БИН/ИИН, роль и рабочие контакты.</span>
        </button>
      </div>
    </div>
  );
}

function StepEmployee({ onSuccess }: { onSuccess: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const normalizedName = normalizeName(fullName);
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      setError('Введите ФИО');
      return;
    }

    if (!phone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    if (!normalizedEmail) {
      setError('Введите эл. почту');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setAuth(
      {
        ...MOCK_AUTH_RESPONSE.user,
        id: `employee-${Date.now()}`,
        full_name: normalizedName,
        phone: phone.trim(),
        email: normalizedEmail,
      },
      {
        ...MOCK_AUTH_RESPONSE.org,
        name: 'Личный рабочий аккаунт',
        slug: 'personal-workspace',
      },
      MOCK_AUTH_RESPONSE.access,
      MOCK_AUTH_RESPONSE.refresh,
      MOCK_AUTH_RESPONSE.capabilities,
      'manager',
    );
    setError('');
    onSuccess();
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Регистрация сотрудника</h2>
        <p className={styles.subtitle}>Создайте доступ для сотрудника без лишних шагов.</p>
      </div>

      <div className={styles.formFields}>
        <input className={styles.input} type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="ФИО" />
        <input className={styles.input} type="tel" value={phone} onChange={(event) => setPhone(trimPhone(event.target.value))} placeholder="Номер телефона" autoComplete="tel" />
        <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Эл. почта" autoComplete="email" />
        <PasswordField value={password} onChange={setPassword} placeholder="Пароль, минимум 6 символов" autoComplete="new-password" />
        <PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Повторите пароль" autoComplete="new-password" />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="button" className={styles.primaryButton} onClick={submit}>
        Создать аккаунт <ChevronRight size={16} />
      </button>
    </div>
  );
}

function StepCompany({ onSuccess }: { onSuccess: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);
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

    if (!normalizeName(companyName)) {
      setError('Введите название компании');
      return;
    }

    if (iinBin.length < 12) {
      setError('Укажите корректный БИН/ИИН из 12 цифр');
      return;
    }

    if (!role) {
      setError('Выберите должность');
      return;
    }

    if (!phone.trim()) {
      setError('Введите рабочий номер телефона');
      return;
    }

    if (!normalizedEmail) {
      setError('Введите рабочую эл. почту');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

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
    setError('');
    onSuccess();
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.title}>Регистрация компании</h2>
        <p className={styles.subtitle}>Юридическая форма автоматически дописывается к названию организации.</p>
      </div>

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
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Название компании"
          />
          <div className={styles.legalPreview}>{legalName || `${orgType} ...`}</div>
        </div>

        <input
          className={styles.input}
          type="text"
          value={iinBin}
          onChange={(event) => setIinBin(event.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="БИН / ИИН"
          inputMode="numeric"
        />

        <div className={styles.selectWrap}>
          <select className={styles.select} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="" disabled>Выберите должность</option>
            {COMPANY_ROLES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <input className={styles.input} type="tel" value={phone} onChange={(event) => setPhone(trimPhone(event.target.value))} placeholder="Рабочий номер" autoComplete="tel" />
        <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Рабочая эл. почта" autoComplete="email" />
        <PasswordField value={password} onChange={setPassword} placeholder="Пароль, минимум 6 символов" autoComplete="new-password" />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button type="button" className={styles.primaryButton} onClick={submit}>
        Зарегистрировать компанию <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function AuthModal({ open, onClose, onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<Step>('login');

  useEffect(() => {
    if (!open) {
      setStep('login');
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const goBack = () => {
    if (step === 'choose-type') {
      setStep('login');
      return;
    }

    if (step === 'employee' || step === 'company') {
      setStep('choose-type');
    }
  };

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
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div className={styles.panel} variants={PANEL} initial="hidden" animate="visible" exit="exit">
            <div className={styles.panelHeader}>
              <div className={styles.brandBlock}>
                <span className={styles.brandMark}>K</span>
                <div>
                  <div className={styles.brandTitle}>KORT</div>
                  <div className={styles.brandText}>Безопасный доступ в рабочую область</div>
                </div>
              </div>

              <div className={styles.headerActions}>
                {step !== 'login' && (
                  <button type="button" className={styles.secondaryHeaderButton} onClick={goBack}>
                    Назад
                  </button>
                )}
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
                  <X size={18} />
                </button>
              </div>
            </div>

            <ModalProgress step={step} />

            <div className={styles.stepViewport}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 'login' && <StepLogin onCreateAccount={() => setStep('choose-type')} onSuccess={onAuthSuccess} />}
                  {step === 'choose-type' && <StepChooseType onSelect={(value) => setStep(value)} />}
                  {step === 'employee' && <StepEmployee onSuccess={onAuthSuccess} />}
                  {step === 'company' && <StepCompany onSuccess={onAuthSuccess} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
