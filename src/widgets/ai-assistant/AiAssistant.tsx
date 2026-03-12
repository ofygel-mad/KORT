import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, Loader2, User, Bot, Trash2 } from 'lucide-react';
import { api } from '../../shared/api/client';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props {
  customerId?: string;
  dealId?: string;
}

const SUGGESTIONS = [
  'Расскажи о последних взаимодействиях',
  'Что обсуждалось с клиентом?',
  'Какой следующий шаг рекомендуешь?',
  'Оцени вероятность закрытия сделки',
];

export function AiAssistant({ customerId, dealId }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setLoading(true);
    const userMsg: Message = { role: 'user', content: msg };
    setHistory((h) => [...h, userMsg]);

    try {
      const res = await api.post('/ai/chat/', {
        message: msg,
        customer_id: customerId,
        deal_id: dealId,
        history: history.slice(-10),
      }) as any;
      setHistory((h) => [...h, { role: 'assistant', content: res.reply }]);
    } catch {
      setHistory((h) => [...h, { role: 'assistant', content: '❌ Не удалось получить ответ. Проверьте API-ключ.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, customerId, dealId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const panel: React.CSSProperties = isMobile ? {
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'flex', flexDirection: 'column',
    background: 'var(--color-bg-elevated)',
  } : {
    position: 'fixed', right: 24, bottom: 24,
    width: 380, height: 560, zIndex: 200,
    display: 'flex', flexDirection: 'column',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', right: 24, bottom: isMobile ? 90 : 24,
          width: 48, height: 48, borderRadius: '50%', zIndex: 199,
          background: 'linear-gradient(135deg, #7C3AED, #D97706)',
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={panel}
          >
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED11, #D9770611)',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Sparkles size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>ИИ-ассистент Kort</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {customerId ? 'Контекст: клиент' : dealId ? 'Контекст: сделка' : 'Общий режим'}
                </div>
              </div>
              {history.length > 0 && (
                <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 4 }}>
                    Задайте вопрос или выберите подсказку:
                  </div>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 12,
                      border: '1px solid var(--color-border)', background: 'var(--color-bg-muted)',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)', transition: 'background var(--transition-fast)',
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {history.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'var(--color-amber-light)' : 'linear-gradient(135deg,#7C3AED,#D97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: msg.role === 'user' ? 'var(--color-amber)' : '#fff', fontSize: 12 }}>
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div style={{
                    maxWidth: '78%', padding: '9px 12px', borderRadius: 10,
                    fontSize: 13, lineHeight: 1.6,
                    background: msg.role === 'user' ? 'var(--color-amber)' : 'var(--color-bg-muted)',
                    color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C3AED,#D97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot size={13} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED' }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Спросить про клиента, сделку..."
                rows={1}
                style={{
                  flex: 1, resize: 'none', padding: '8px 12px', fontSize: 13,
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-muted)', color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5,
                  maxHeight: 120, overflowY: 'auto',
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  background: input.trim() && !loading ? 'linear-gradient(135deg,#7C3AED,#D97706)' : 'var(--color-bg-muted)',
                  color: input.trim() && !loading ? '#fff' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'all 0.15s',
                }}>
                {loading ? <Loader2 size={16} style={{ animation: 'cp-spin 0.6s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
