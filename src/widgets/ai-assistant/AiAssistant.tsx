import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, Loader2, User, Bot, Trash2 } from 'lucide-react';
import { api } from '../../shared/api/client';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import s from './AiAssistant.module.css';

/* ── Types ──────────────────────────────────────────────────── */
interface Message { role: 'user' | 'assistant'; content: string; }
interface Props { customerId?: string; dealId?: string; }

const SUGGESTIONS = [
  'Расскажи о последних взаимодействиях',
  'Что обсуждалось с клиентом?',
  'Какой следующий шаг рекомендуешь?',
  'Оцени вероятность закрытия сделки',
];

/* ── Panel dimensions ────────────────────────────────────────── */
// Width/height/position are runtime values that depend on viewport.
// They live in inline style (correct use per architecture doc).
const DESKTOP_PANEL: CSSProperties = {
  position: 'fixed', right: 24, bottom: 24,
  width: 380, height: 560, zIndex: 200,
  display: 'flex', flexDirection: 'column',
  background: 'var(--bg-surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  overflow: 'hidden',
};

const MOBILE_PANEL: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  display: 'flex', flexDirection: 'column',
  background: 'var(--bg-surface-elevated)',
};

/* ── Component ───────────────────────────────────────────────── */
export function AiAssistant({ customerId, dealId }: Props) {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile              = useIsMobile();
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);
    setHistory(h => [...h, { role: 'user', content: msg }]);
    try {
      const res = await api.post('/ai/chat/', {
        message: msg, customer_id: customerId, deal_id: dealId, history: history.slice(-10),
      }) as any;
      setHistory(h => [...h, { role: 'assistant', content: res.reply }]);
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: '❌ Не удалось получить ответ. Проверьте API-ключ.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, customerId, dealId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const contextLabel = customerId ? 'Контекст: клиент' : dealId ? 'Контекст: сделка' : 'Общий режим';

  return (
    <>
      {/* Trigger */}
      <motion.button
        className={s.trigger}
        style={{ '--trigger-bottom': `${isMobile ? 90 : 24}px` } as CSSProperties}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Закрыть ИИ-ассистент' : 'Открыть ИИ-ассистент'}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            style={isMobile ? MOBILE_PANEL : DESKTOP_PANEL}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0,  scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            {/* Header */}
            <div className={s.panelHeader}>
              <div className={s.headerAvatar}><Sparkles size={16} /></div>
              <div className={s.headerInfo}>
                <div className={s.headerTitle}>ИИ-ассистент Kort</div>
                <div className={s.headerContext}>{contextLabel}</div>
              </div>
              {history.length > 0 && (
                <button className={s.headerAction} onClick={() => setHistory([])} aria-label="Очистить историю">
                  <Trash2 size={14} />
                </button>
              )}
              <button className={s.headerAction} onClick={() => setOpen(false)} aria-label="Закрыть">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className={s.messages}>
              {history.length === 0 && (
                <div className={s.suggestions}>
                  <div className={s.suggestionsHint}>Задайте вопрос или выберите подсказку:</div>
                  {SUGGESTIONS.map(sug => (
                    <button key={sug} className={s.suggestionBtn} onClick={() => send(sug)}>{sug}</button>
                  ))}
                </div>
              )}

              {history.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`${s.msgRow} ${msg.role === 'user' ? s.user : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={`${s.msgAvatar} ${msg.role === 'user' ? s.user : s.bot}`}>
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div className={`${s.bubble} ${msg.role === 'user' ? s.user : s.bot}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className={s.typingRow}>
                  <div className={`${s.msgAvatar} ${s.bot}`}><Bot size={13} /></div>
                  <div className={s.typingDots}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className={s.typingDot}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={s.inputArea}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Спросить про клиента, сделку..."
                rows={1}
                className={s.inputTextarea}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className={`${s.sendBtn} ${input.trim() && !loading ? s.active : s.inactive}`}
                aria-label="Отправить"
              >
                {loading
                  ? <Loader2 size={16} className={s.sendLoader} />
                  : <Send size={16} />
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
