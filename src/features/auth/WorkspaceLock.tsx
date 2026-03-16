import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '../../shared/stores/auth';
import styles from './WorkspaceLock.module.css';

interface WorkspaceLockProps {
  onUnlocked: () => void;
}

type ChainDirection = 'nw' | 'ne' | 'sw' | 'se';

type Point = { x1: number; y1: number; x2: number; y2: number };

type ChainSpec = {
  idle: Point;
  hover: Point;
  release: { x1: number[]; y1: number[]; x2: number[]; y2: number[]; opacity: number[]; strokeWidth: number[] };
  delay: number;
};

const CHAIN_SPECS: Record<ChainDirection, ChainSpec> = {
  nw: {
    idle: { x1: 12, y1: 24, x2: 43.2, y2: 40.2 },
    hover: { x1: 11.4, y1: 23.3, x2: 43.9, y2: 39.6 },
    release: {
      x1: [12, 11.2, 8.2, 3.4],
      y1: [24, 23.2, 21.3, 18.2],
      x2: [43.2, 42.4, 34.8, 23],
      y2: [40.2, 39.1, 33.6, 25.5],
      opacity: [1, 1, 0.94, 0],
      strokeWidth: [1.02, 1.08, 0.96, 0.72],
    },
    delay: 0.02,
  },
  ne: {
    idle: { x1: 88, y1: 24, x2: 56.8, y2: 40.2 },
    hover: { x1: 88.6, y1: 23.3, x2: 56.1, y2: 39.6 },
    release: {
      x1: [88, 88.8, 91.8, 96.6],
      y1: [24, 23.2, 21.3, 18.2],
      x2: [56.8, 57.6, 65.2, 77],
      y2: [40.2, 39.1, 33.6, 25.5],
      opacity: [1, 1, 0.94, 0],
      strokeWidth: [1.02, 1.08, 0.96, 0.72],
    },
    delay: 0.09,
  },
  sw: {
    idle: { x1: 12, y1: 76, x2: 43.2, y2: 59.8 },
    hover: { x1: 11.4, y1: 76.7, x2: 43.9, y2: 60.4 },
    release: {
      x1: [12, 11.2, 8.2, 3.4],
      y1: [76, 76.8, 78.7, 81.8],
      x2: [43.2, 42.4, 34.8, 23],
      y2: [59.8, 60.9, 66.4, 74.5],
      opacity: [1, 1, 0.94, 0],
      strokeWidth: [1.02, 1.08, 0.96, 0.72],
    },
    delay: 0.05,
  },
  se: {
    idle: { x1: 88, y1: 76, x2: 56.8, y2: 59.8 },
    hover: { x1: 88.6, y1: 76.7, x2: 56.1, y2: 60.4 },
    release: {
      x1: [88, 88.8, 91.8, 96.6],
      y1: [76, 76.8, 78.7, 81.8],
      x2: [56.8, 57.6, 65.2, 77],
      y2: [59.8, 60.9, 66.4, 74.5],
      opacity: [1, 1, 0.94, 0],
      strokeWidth: [1.02, 1.08, 0.96, 0.72],
    },
    delay: 0.12,
  },
};

function LockGlyph({ active, releasing }: { active: boolean; releasing: boolean }) {
  return (
    <motion.svg
      className={styles.lockSvg}
      viewBox="0 0 128 144"
      aria-hidden="true"
      animate={
        releasing
          ? { scale: [1, 0.97, 0.84], opacity: [1, 0.92, 0], y: [0, -3, -8] }
          : active
            ? { scale: 1.04, y: -2 }
            : { scale: 1, y: 0, opacity: 1 }
      }
      transition={
        releasing
          ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
          : { type: 'spring', stiffness: 320, damping: 22 }
      }
    >
      <defs>
        <linearGradient id="kortLockBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f4f8" />
          <stop offset="24%" stopColor="#cdd4de" />
          <stop offset="58%" stopColor="#8c95a3" />
          <stop offset="100%" stopColor="#555f6f" />
        </linearGradient>
        <linearGradient id="kortLockShackle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef2f7" />
          <stop offset="48%" stopColor="#a6afbc" />
          <stop offset="100%" stopColor="#606b7b" />
        </linearGradient>
      </defs>

      <motion.path
        d="M40 58V43c0-14.4 10.8-25 24-25s24 10.6 24 25v15"
        fill="none"
        stroke="url(#kortLockShackle)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={releasing ? { pathLength: [1, 0.86, 0.45], opacity: [1, 0.9, 0] } : active ? { y: [-1, -4, -1] } : { y: 0, opacity: 1 }}
        transition={releasing ? { duration: 0.24, ease: 'easeIn' } : { duration: 0.28, ease: 'easeInOut' }}
      />
      <path
        d="M26 60c0-7.7 6.3-14 14-14h48c7.7 0 14 6.3 14 14v44c0 10-8 18-18 18H44c-10 0-18-8-18-18V60z"
        fill="url(#kortLockBody)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.4"
      />
      <path
        d="M36 65h56c4.4 0 8 3.6 8 8v22c0 12.7-10.3 23-23 23H51c-12.7 0-23-10.3-23-23V73c0-4.4 3.6-8 8-8z"
        fill="rgba(255,255,255,0.08)"
      />
      <path
        d="M64 74c-8 0-14 6-14 13.5 0 5.4 3.1 9.2 7.2 11.4V110c0 3.4 2.7 6.1 6.8 6.1s6.8-2.7 6.8-6.1V98.9c4.1-2.2 7.2-6 7.2-11.4C78 80 72 74 64 74z"
        fill="rgba(245,247,250,0.96)"
      />
    </motion.svg>
  );
}

function ChainLine({ direction, hovered, releasing }: { direction: ChainDirection; hovered: boolean; releasing: boolean }) {
  const spec = CHAIN_SPECS[direction];

  return (
    <motion.line
      initial={false}
      animate={releasing ? spec.release : hovered ? { ...spec.hover, opacity: 1, strokeWidth: 1.12 } : { ...spec.idle, opacity: 0.96, strokeWidth: 1.02 }}
      transition={
        releasing
          ? {
              duration: 0.96,
              delay: spec.delay,
              times: [0, 0.13, 0.46, 1],
              ease: [0.22, 1, 0.36, 1],
            }
          : { duration: hovered ? 0.26 : 0.2, ease: 'easeInOut' }
      }
      vectorEffect="non-scaling-stroke"
      stroke="url(#chainStroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#chainShadow)"
    />
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

        <svg className={styles.chainLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="chainStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0f3f8" />
              <stop offset="28%" stopColor="#c9d0da" />
              <stop offset="65%" stopColor="#8f98a6" />
              <stop offset="100%" stopColor="#5b6472" />
            </linearGradient>
            <filter id="chainShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#02050a" floodOpacity="0.35" />
            </filter>
          </defs>
          <ChainLine direction="nw" hovered={hovered || lockHovered} releasing={releasing} />
          <ChainLine direction="ne" hovered={hovered || lockHovered} releasing={releasing} />
          <ChainLine direction="sw" hovered={hovered || lockHovered} releasing={releasing} />
          <ChainLine direction="se" hovered={hovered || lockHovered} releasing={releasing} />
        </svg>

        <motion.button
          type="button"
          className={styles.lockButton}
          onMouseEnter={() => setLockHovered(true)}
          onMouseLeave={() => setLockHovered(false)}
          onClick={() => {
            if (!releasing) setModalOpen(true);
          }}
          animate={releasing ? { scale: [1, 0.96, 0.84], opacity: [1, 0.94, 0] } : lockHovered ? { scale: 1.04, y: -2 } : { scale: 1, y: 0, opacity: 1 }}
          transition={releasing ? { duration: 0.44, ease: [0.22, 1, 0.36, 1] } : { type: 'spring', stiffness: 290, damping: 20 }}
          whileTap={releasing ? undefined : { scale: 0.986 }}
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

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  );
}
