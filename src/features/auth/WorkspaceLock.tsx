import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '../../shared/stores/auth';
import styles from './WorkspaceLock.module.css';

interface WorkspaceLockProps {
  onUnlocked: () => void;
}

function LockGlyph({ active, releasing }: { active: boolean; releasing: boolean }) {
  return (
    <motion.svg
      className={styles.lockSvg}
      viewBox="0 0 128 144"
      aria-hidden="true"
      animate={
        releasing
          ? { scale: [1, 1.06, 0.78], opacity: [1, 0.94, 0], y: [0, -6, -16] }
          : active
            ? { scale: 1.06, y: -3 }
            : { scale: 1, y: 0, opacity: 1 }
      }
      transition={
        releasing
          ? { duration: 0.56, ease: [0.22, 1, 0.36, 1] }
          : { type: 'spring', stiffness: 280, damping: 20 }
      }
    >
      <defs>
        <linearGradient id="kortLockBody" x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor="#e8edf5" />
          <stop offset="12%" stopColor="#d6dde9" />
          <stop offset="35%" stopColor="#aab5c6" />
          <stop offset="58%" stopColor="#7e8a9e" />
          <stop offset="80%" stopColor="#586378" />
          <stop offset="100%" stopColor="#3c4555" />
        </linearGradient>
        <linearGradient id="kortLockShackle" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#f2f5fa" />
          <stop offset="25%" stopColor="#cdd5e2" />
          <stop offset="55%" stopColor="#909aac" />
          <stop offset="100%" stopColor="#555f72" />
        </linearGradient>
        <radialGradient id="kortKeyholeGlow" cx="0.5" cy="0.38" r="0.5">
          <stop offset="0%" stopColor="rgba(190,205,230,0.25)" />
          <stop offset="100%" stopColor="rgba(190,205,230,0)" />
        </radialGradient>
        <clipPath id="lockBodyClip">
          <path d="M26 60c0-7.7 6.3-14 14-14h48c7.7 0 14 6.3 14 14v44c0 10-8 18-18 18H44c-10 0-18-8-18-18V60z" />
        </clipPath>
        <filter id="shimmerBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Shackle */}
      <motion.path
        d="M40 58V43c0-14.4 10.8-25 24-25s24 10.6 24 25v15"
        fill="none"
        stroke="url(#kortLockShackle)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={
          releasing
            ? { pathLength: [1, 0.8, 0.2], opacity: [1, 0.85, 0], y: [0, -8, -20] }
            : active
              ? { y: -4 }
              : { y: 0, opacity: 1 }
        }
        transition={
          releasing
            ? { duration: 0.4, ease: 'easeIn' }
            : active
              ? { duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }
              : { duration: 0.3, ease: 'easeInOut' }
        }
      />
      {/* Shackle specular highlight */}
      <motion.path
        d="M44 58V44c0-12.5 9-21 20-21s20 8.5 20 21v14"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
        animate={
          releasing ? { opacity: 0 } : active ? { y: -4 } : { y: 0 }
        }
        transition={
          releasing
            ? { duration: 0.2 }
            : active
              ? { duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }
              : { duration: 0.3 }
        }
      />

      {/* Lock body */}
      <path
        d="M26 60c0-7.7 6.3-14 14-14h48c7.7 0 14 6.3 14 14v44c0 10-8 18-18 18H44c-10 0-18-8-18-18V60z"
        fill="url(#kortLockBody)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      {/* Top edge highlight */}
      <path
        d="M28 60c0-6.6 5.4-12 12-12h48c6.6 0 12 5.4 12 12v2H28v-2z"
        fill="rgba(255,255,255,0.1)"
      />
      {/* Inner panel */}
      <path
        d="M34 64h60c3.3 0 6 2.7 6 6v26c0 11-9 20-20 20H48c-11 0-20-9-20-20V70c0-3.3 2.7-6 6-6z"
        fill="rgba(255,255,255,0.04)"
      />

      {/* Shimmer sweep across body */}
      <g clipPath="url(#lockBodyClip)">
        <motion.rect
          y="46" width="28" height="80" rx="4"
          fill="rgba(255,255,255,0.08)"
          filter="url(#shimmerBlur)"
          animate={{ x: [-30, 130] }}
          transition={{ duration: 3, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 4 }}
        />
      </g>

      {/* Keyhole glow */}
      <circle cx="64" cy="90" r="20" fill="url(#kortKeyholeGlow)" />
      {/* Keyhole */}
      <path
        d="M64 76c-6.6 0-12 5-12 11.2 0 4.5 2.6 7.7 6 9.5v10.3c0 3 2.3 5.2 6 5.2s6-2.2 6-5.2V96.7c3.4-1.8 6-5 6-9.5C76 81 70.6 76 64 76z"
        fill="rgba(238,242,250,0.95)"
      />
      {/* Keyhole inner shadow */}
      <path
        d="M64 79c-5 0-9 3.8-9 8.6 0 3.4 2 5.9 4.5 7.2v8.7c0 2.2 1.7 3.7 4.5 3.7s4.5-1.5 4.5-3.7v-8.7c2.5-1.3 4.5-3.8 4.5-7.2C73 82.8 69 79 64 79z"
        fill="rgba(180,195,220,0.12)"
      />
      {/* Specular dot */}
      <circle cx="64" cy="86" r="2.2" fill="rgba(255,255,255,0.55)" />
    </motion.svg>
  );
}

export function WorkspaceLock({ onUnlocked }: WorkspaceLockProps) {
  const unlock = useAuthStore((state) => state.unlock);
  const [hovered, setHovered] = useState(false);
  const [lockHovered, setLockHovered] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const hintVisible = useMemo(() => lockHovered && !releasing, [lockHovered, releasing]);

  const handleAuthSuccess = useCallback(() => {
    setModalOpen(false);
    setReleasing(true);

    window.setTimeout(() => {
      unlock();
      setHidden(true);
      onUnlocked();
    }, 1120);
  }, [onUnlocked, unlock]);

  if (hidden) return null;

  return (
    <>
      <motion.div
        className={[styles.root, hovered ? styles.rootHovered : '', releasing ? styles.rootReleasing : ''].join(' ')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setLockHovered(false);
        }}
        animate={releasing ? { opacity: [1, 1, 0] } : { opacity: 1 }}
        transition={releasing ? { duration: 0.48, delay: 0.64, times: [0, 0.18, 1], ease: 'easeOut' } : { duration: 0.2 }}
      >
        <video className={styles.backgroundVideo} autoPlay muted loop playsInline preload="auto" aria-hidden="true">
          <source src="/lock-background.mp4" type="video/mp4" />
        </video>

        <div className={styles.scrim} aria-hidden="true" />
        <div className={styles.centerGlow} aria-hidden="true" />

        {/* Premium glow rings */}
        <div className={styles.glowRings} aria-hidden="true">
          <div className={`${styles.glowRing} ${styles.glowRing1}`} />
          <div className={`${styles.glowRing} ${styles.glowRing2}`} />
          <div className={`${styles.glowRing} ${styles.glowRing3}`} />
        </div>

        <motion.button
          type="button"
          className={styles.lockButton}
          onMouseEnter={() => setLockHovered(true)}
          onMouseLeave={() => setLockHovered(false)}
          onClick={() => {
            if (!releasing) setModalOpen(true);
          }}
          animate={
            releasing
              ? { scale: [1, 1.08, 0.78], opacity: [1, 0.96, 0] }
              : lockHovered
                ? { scale: 1.06, y: -3 }
                : { scale: 1, y: 0, opacity: 1 }
          }
          transition={
            releasing
              ? { duration: 0.56, ease: [0.22, 1, 0.36, 1] }
              : { type: 'spring', stiffness: 260, damping: 18 }
          }
          whileTap={releasing ? undefined : { scale: 0.97 }}
          aria-label="Открыть окно авторизации"
        >
          <span className={styles.lockAura} aria-hidden="true" />
          <LockGlyph active={lockHovered} releasing={releasing} />
        </motion.button>

        <AnimatePresence>
          {hintVisible && (
            <motion.div className={styles.lockHint} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}>
              Нажмите, чтобы разблокировать рабочую область
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} onAuthSuccess={handleAuthSuccess} />
    </>
  );
}
