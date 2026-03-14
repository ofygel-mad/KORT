/**
 * Draft SPA — Free-form customizable workspace. Users build their own tools here.
 * Lives at: src/features/workspace/widgets/draft/spa/DraftSPA.tsx
 */
import { useState } from 'react';
import { Plus, FileText, BarChart3, Table2, Trash2 } from 'lucide-react';
import s from './DraftSPA.module.css';

type BlockType = 'note' | 'table' | 'chart';
interface Block { id: string; type: BlockType; title: string; content: string; }

const BLOCK_OPTIONS: { type: BlockType; icon: typeof FileText; label: string; desc: string }[] = [
  { type: 'note',  icon: FileText,  label: 'Заметка',   desc: 'Свободный текст или список' },
  { type: 'table', icon: Table2,    label: 'Таблица',   desc: 'Произвольная таблица данных' },
  { type: 'chart', icon: BarChart3, label: 'Диаграмма', desc: 'Визуализация метрики' },
];

export function DraftSPA() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [picking, setPicking] = useState(false);

  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      title: BLOCK_OPTIONS.find(b => b.type === type)!.label,
      content: '',
    }]);
    setPicking(false);
  };

  const remove = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));
  const update = (id: string, content: string) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div>
          <span className={s.title}>Черновик</span>
          <span className={s.sub}>Ваше личное пространство — стройте под себя</span>
        </div>
        <button className={s.addBtn} onClick={() => setPicking(v => !v)}>
          <Plus size={14} /> Добавить блок
        </button>
      </div>

      {picking && (
        <div className={s.picker}>
          {BLOCK_OPTIONS.map(opt => (
            <button key={opt.type} className={s.pickerCard} onClick={() => addBlock(opt.type)}>
              <opt.icon size={18} className={s.pickerIcon} />
              <div>
                <div className={s.pickerLabel}>{opt.label}</div>
                <div className={s.pickerDesc}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className={s.canvas}>
        {blocks.length === 0 && !picking ? (
          <div className={s.empty}>
            <Plus size={32} className={s.emptyIcon} />
            <span>Добавьте первый блок, чтобы начать</span>
            <button className={s.emptyBtn} onClick={() => setPicking(true)}>Добавить блок</button>
          </div>
        ) : blocks.map(block => (
          <div key={block.id} className={s.block}>
            <div className={s.blockHeader}>
              <span className={s.blockTitle}>{block.title}</span>
              <button className={s.blockRemove} onClick={() => remove(block.id)}>
                <Trash2 size={13} />
              </button>
            </div>
            {block.type === 'note' && (
              <textarea
                className={s.noteArea}
                placeholder="Пишите что угодно..."
                value={block.content}
                onChange={e => update(block.id, e.target.value)}
              />
            )}
            {block.type === 'table' && (
              <div className={s.tablePlaceholder}>
                <Table2 size={20} />
                <span>Таблица — в разработке</span>
              </div>
            )}
            {block.type === 'chart' && (
              <div className={s.chartPlaceholder}>
                <div className={s.chartBars}>
                  {[40,70,55,90,65,80].map((h, i) => (
                    <div key={i} className={s.chartBar} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span>Диаграмма — подключите данные</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
