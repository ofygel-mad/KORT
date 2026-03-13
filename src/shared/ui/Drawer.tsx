import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { sheetVariants, overlayVariants } from '../motion/presets';
import s from './Drawer.module.css';

type DrawerSize = 'sm' | 'md' | 'lg';

interface DrawerProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  subtitle?: string;
  children:  ReactNode;
  size?:     DrawerSize;
  footer?:   ReactNode;
  /** @deprecated use size instead */
  width?:    number;
}

const SIZE_WIDTH: Record<DrawerSize, number> = { sm: 380, md: 480, lg: 600 };

export function Drawer({ open, onClose, title, subtitle, children, size = 'md', footer, width }: DrawerProps) {
  const isMobile  = useIsMobile();
  const panelWidth = width ?? SIZE_WIDTH[size];

  const titleBlock = (
    <div className={s.titleBlock}>
      <div className={s.title}>{title}</div>
      {subtitle && <div className={s.subtitle}>{subtitle}</div>}
    </div>
  );

  const closeBtn = (
    <button className={s.closeBtn} onClick={onClose} aria-label="Закрыть">
      <X size={16} />
    </button>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div className={s.overlay} variants={overlayVariants}
              initial="hidden" animate="visible" exit="hidden" onClick={onClose} />
            <motion.div className={s.panelMobile}
              variants={sheetVariants}
              initial="hidden" animate="visible" exit="hidden">
              <div className={s.header}>{titleBlock}{closeBtn}</div>
              <div className={s.body}>{children}</div>
              {footer && <div className={s.footer}>{footer}</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className={s.overlay} variants={overlayVariants}
            initial="hidden" animate="visible" exit="hidden" onClick={onClose} />
          <motion.div
            className={s.panel}
            style={{ width: panelWidth }}
            variants={sheetVariants}
            initial="hidden" animate="visible" exit="hidden">
            <div className={s.header}>{titleBlock}{closeBtn}</div>
            <div className={s.body}>{children}</div>
            {footer && <div className={s.footer}>{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
