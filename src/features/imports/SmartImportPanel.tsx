/**
 * features/imports/SmartImportPanel.tsx
 *
 * Module selector shown at the top of the Imports page.
 * Supports single-target and "Сформировать базу" multi-target mode.
 * Designed to sit above the existing wizard without replacing it.
 */

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import s from './SmartImportPanel.module.css';

const IMPORT_TARGETS = [
  { value: 'customers',       label: 'Клиенты',           emoji: '👤' },
  { value: 'leads',           label: 'Лиды',              emoji: '🎯' },
  { value: 'orders',          label: 'Заказы',            emoji: '📋' },
  { value: 'catalog',         label: 'Каталог',           emoji: '🗂' },
  { value: 'warehouse_items', label: 'Склад (позиции)',    emoji: '📦' },
  { value: 'accounting',      label: 'Проводки',          emoji: '💳' },
] as const;

type ImportTarget = typeof IMPORT_TARGETS[number]['value'];

interface Props {
  selectedTarget: ImportTarget;
  onTargetChange: (t: ImportTarget) => void;
  smartBuildMode: boolean;
  onSmartBuildChange: (v: boolean) => void;
  smartTargets: Set<ImportTarget>;
  onSmartTargetsChange: (t: Set<ImportTarget>) => void;
}

export function SmartImportPanel({
  selectedTarget,
  onTargetChange,
  smartBuildMode,
  onSmartBuildChange,
  smartTargets,
  onSmartTargetsChange,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  function toggleSmartTarget(t: ImportTarget) {
    const next = new Set(smartTargets);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onSmartTargetsChange(next);
  }

  return (
    <div className={s.panel}>
      <button className={s.panelToggle} onClick={() => setExpanded((x) => !x)}>
        <span className={s.panelTitle}>
          <Sparkles size={14} className={s.sparkle} />
          Параметры импорта
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className={s.body}>
          {/* Smart Build toggle */}
          <div className={s.smartRow}>
            <label className={s.smartToggle}>
              <div
                className={`${s.toggle} ${smartBuildMode ? s.toggleOn : ''}`}
                onClick={() => onSmartBuildChange(!smartBuildMode)}
                role="switch"
                aria-checked={smartBuildMode}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSmartBuildChange(!smartBuildMode)}
              >
                <div className={s.toggleThumb} />
              </div>
              <div>
                <div className={s.smartLabel}>Сформировать базу</div>
                <div className={s.smartDesc}>
                  Система автоматически определит тип данных и предложит заполнить сразу несколько разделов из одного файла
                </div>
              </div>
            </label>
          </div>

          {/* Target selector */}
          {smartBuildMode ? (
            <div className={s.multiTargets}>
              <div className={s.multiLabel}>Выберите разделы для заполнения:</div>
              <div className={s.chips}>
                {IMPORT_TARGETS.map((t) => (
                  <button
                    key={t.value}
                    className={`${s.chip} ${smartTargets.has(t.value) ? s.chipActive : ''}`}
                    onClick={() => toggleSmartTarget(t.value)}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
              {smartTargets.size === 0 && (
                <div className={s.warning}>Выберите хотя бы один раздел</div>
              )}
            </div>
          ) : (
            <div className={s.singleTarget}>
              <div className={s.singleLabel}>Целевой модуль:</div>
              <div className={s.chips}>
                {IMPORT_TARGETS.map((t) => (
                  <button
                    key={t.value}
                    className={`${s.chip} ${selectedTarget === t.value ? s.chipActive : ''}`}
                    onClick={() => onTargetChange(t.value)}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
