import { setProductMoment } from '../../../shared/utils/productMoment';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { resolveOnboardingCompleted } from '../../../shared/lib/auth';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { motion } from 'framer-motion';
import styles from './Login.module.css';

interface LoginForm { email: string; password: string; }

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res: any = await api.post('/auth/login', {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      setAuth(res.user, res.org, res.access, res.refresh, res.capabilities ?? [], res.role ?? 'viewer');
      const onboardingCompleted = resolveOnboardingCompleted(res, res.org?.onboarding_completed ?? false);
      setProductMoment(onboardingCompleted
        ? 'С возвращением. Данные загружены, очередь обновлена.'
        : 'Добро пожаловать. Первый шаг - заполнить профиль компании.');
      navigate(onboardingCompleted ? '/' : '/onboarding', { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.detail;
      if (msg?.includes('деактивирован')) {
        toast.error('Аккаунт деактивирован. Обратитесь к администратору.');
      } else if (e?.response?.status === 429) {
        toast.error('Слишком много попыток. Подождите минуту.');
      } else {
        toast.error('Неверный email или пароль');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Добро пожаловать</h2>
        <p className={styles.subtitle}>Войдите, чтобы продолжить работу</p>
        <div className={styles.journeyRail}>
          <span className={styles.journeyBadge}>Входной маршрут</span>
          <div className={styles.journeyText}>Вход → настройка → рабочий контур без лишних шагов.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        {/* Email */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">Email</label>
          <input
            id="login-email"
            {...register('email', { required: true })}
            type="email"
            placeholder="you@company.kz"
            autoComplete="email"
            autoFocus
            className={`${styles.inputBase}${errors.email ? ' ' + styles.error : ''}`}
          />
          {errors.email && (
            <span className={styles.fieldError}>Введите email</span>
          )}
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">Пароль</label>
          <div className={styles.inputWrap}>
            <input
              id="login-password"
              {...register('password', { required: true })}
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`${styles.inputBase} ${styles.inputWithToggle}${errors.password ? ' ' + styles.error : ''}`}
            />
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <span className={styles.fieldError}>Введите пароль</span>
          )}
        </div>

        {/* Forgot link */}
        <button type="button" className={styles.forgotLink} onClick={() => toast.info('Восстановление пароля будет доступно в следующем релизном проходе.')}>
          Забыли пароль?
        </button>

        {/* Submit */}
        <div className={styles.submitBtn}>
          <Button type="submit" loading={isSubmitting} fullWidth>
            Войти
          </Button>
        </div>
      </form>

      <div className={styles.footer}>
        Нет аккаунта?{' '}
        <Link to="/auth/register" className={styles.footerLink}>
          Зарегистрироваться
        </Link>
      </div>
    </motion.div>
  );
}
