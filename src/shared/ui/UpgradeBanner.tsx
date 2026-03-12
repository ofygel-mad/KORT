import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface UpgradeBannerProps {
  triggerMessage?: string;
}

export function UpgradeBanner({ triggerMessage }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const org = useAuthStore(s => s.org);

  if (!org || org.mode === 'industrial' || dismissed) return null;

  const nextMode = org.mode === 'basic' ? 'advanced' : 'industrial';
  const nextLabel = nextMode === 'advanced' ? 'Продвинутый' : 'Промышленный';

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', marginBottom: 20,
            background: 'linear-gradient(135deg, #FEF3C7, #FFFBEB)',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Zap size={15} color="var(--color-amber)" style={{ flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: '#92400E', flex: 1 }}>
            {triggerMessage ?? `Ваш бизнес растёт — пора перейти на ${nextLabel} режим.`}
          </span>
          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, color: 'var(--color-amber)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', flexShrink: 0,
            }}
          >
            Обновить <ChevronRight size={12}/>
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', flexShrink: 0, display: 'flex' }}
          >
            <X size={13}/>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
