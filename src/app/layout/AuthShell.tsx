import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../shared/stores/auth';
import { KortLogo } from '../../shared/ui/KortLogo';
import { AuthPresentation } from './AuthPresentation';
import styles from './AuthShell.module.css';
import { fadeUp } from '../../shared/motion/presets';

export function AuthShell() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;

  return (
    <div className={styles.shell}>
      {/* ── Brand panel ──────────────────────────────────── */}
      <div className={styles.brand}>
        {/* Logo pinned top-left */}
        <div className={styles.brandLogo}>
          <KortLogo size={44} />
          <span className={styles.brandLogoName}>Kort</span>
        </div>

        {/* Animated presentation fills the rest */}
        <AuthPresentation />
      </div>

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
