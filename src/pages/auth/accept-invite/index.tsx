import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { KortLogo } from '../../../shared/ui/KortLogo';
import s from './AcceptInvite.module.css';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token    = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  if (!token) {
    return (
      <div className={s.errorState}>
        <p className={s.errorText}>Неверная ссылка приглашения.</p>
        <Link to="/auth/login">← Войти</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Пароль минимум 8 символов'); return; }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/accept-invite', { token, password, full_name: fullName });
      setAuth(res.user, res.org, res.access, res.refresh, res.capabilities ?? [], res.role ?? 'manager');
      toast.success('Добро пожаловать!');
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка принятия приглашения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={s.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={s.header}>
        <div className={s.logoWrap}><KortLogo size={44} /></div>
        <h1 className={s.title}>Принять приглашение</h1>
        <p className={s.subtitle}>Создайте пароль для вашего аккаунта</p>
      </div>

      <form className={s.form} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label className={s.label}>Ваше имя</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Иван Иванов"
            required
            className="kort-input"
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>Пароль *</label>
          <div className={s.inputWrap}>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type={showPwd ? 'text' : 'password'}
              placeholder="Минимум 8 символов"
              required
              className={`kort-input ${s.passwordInput}`}
            />
            <button type="button" className={s.pwdToggle} onClick={() => setShowPwd(v => !v)}>
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={s.submitBtn}>
          {loading ? 'Регистрируемся...' : 'Принять и войти'}
        </button>
      </form>
    </motion.div>
  );
}
