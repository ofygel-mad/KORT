import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../shared/stores/auth';
import { TrendingUp, Users, CheckSquare, Zap, Shield, Globe } from 'lucide-react';
import { KortLogo } from '../../shared/ui/KortLogo';
import styles from './AuthShell.module.css';
import { pageTransition, fadeUp } from '../../shared/motion/presets';

const STATS = [
  { icon: <Users size={14} />, value: '2 400+', label: 'клиентов под управлением' },
  { icon: <TrendingUp size={14} />, value: '₸ 1.2 млрд', label: 'сделок в воронке' },
  { icon: <CheckSquare size={14} />, value: '98%', label: 'задач закрыты вовремя' },
];

const FEATURES = [
  { icon: <Zap size={15} />,    title: 'Скорость',    desc: 'Поиск за 200мс. Действие в один клик.' },
  { icon: <Shield size={15} />, title: 'Надёжность',  desc: 'Аудит, роли, права. Данные под контролем.' },
  { icon: <Globe size={15} />,  title: 'Локально',    desc: '₸, WhatsApp, БИН/ИИН. Сделано для Казахстана.' },
];

export function AuthShell() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;

  return (
    <div className={styles.shell}>
      {/* ── Brand panel ──────────────────────────────────── */}
      <motion.div className={styles.brand} {...pageTransition}>
        <div className={styles.brandGlow1} />
        <div className={styles.brandGlow2} />

        <div className={styles.brandContent}>
          <div className={styles.brandLogo}>
            <KortLogo size={40} />
            <span className={styles.brandLogoName}>Kort</span>
          </div>

          <h1 className={styles.brandHeadline}>
            Операционный центр
            <br />
            <span className={styles.brandAccent}>вашего бизнеса</span>
          </h1>
          <p className={styles.brandSubtitle}>
            Клиенты, сделки, задачи и коммуникации&nbsp;—<br />
            в одной системе. Без хаоса Excel и мессенджеров.
          </p>

          <div className={styles.statsStrip}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <div className={styles.statItemValue}>
                  <span className={styles.statItemIcon}>{s.icon}</span>
                  <span className={styles.statItemNumber}>{s.value}</span>
                </div>
                <div className={styles.statItemLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureItem}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div>
                  <div className={styles.featureTitle}>{f.title}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Form panel ───────────────────────────────────── */}
      <motion.div className={styles.formPanel} variants={fadeUp} initial="hidden" animate="show">
        <div className={styles.formInner}>
          <Outlet />
        </div>
        <div className={styles.formFooter}>
          © 2025 Kort · Казахстан · Все права защищены
        </div>
      </motion.div>
    </div>
  );
}
