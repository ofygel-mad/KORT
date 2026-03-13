import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from './AuthPresentation.module.css';

/* ═══════════════════════════════════════════════════
   PARTICLE SYSTEM
   ═══════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  isGold: boolean;
}

function useParticles(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      canvas.width  = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const COUNT = 75;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      vx:     (Math.random() - 0.5) * 0.35,
      vy:     (Math.random() - 0.5) * 0.35,
      size:   Math.random() * 1.8 + 0.4,
      alpha:  Math.random() * 0.45 + 0.08,
      isGold: Math.random() > 0.65,
    }));

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    let raf = 0;
    const MAX_DIST  = 90;
    const LINK_DIST = 85;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          const f = ((MAX_DIST - d) / MAX_DIST) * 0.025;
          p.vx += dx * f * 0.012;
          p.vy += dy * f * 0.012;
        }
        p.vx *= 0.979; p.vy *= 0.979;
        p.x  += p.vx;  p.y  += p.vy;
        if (p.x < 0) p.x = width;   if (p.x > width)  p.x = 0;
        if (p.y < 0) p.y = height;  if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(245,158,11,${p.alpha})`
          : `rgba(240,242,245,${p.alpha * 0.55})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const a = (1 - d / LINK_DIST) * 0.13;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${a})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [canvasRef, containerRef]);
}

/* ═══════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════ */
function useCountUp(target: number, duration = 1900, active = false): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

const CHARS = 'АБВГДЕЖЗИКЛМНОПРСТУФХabcdefghijklmnopqrstuvwxyz0123456789';
function useTextScramble(text: string, active: boolean): string {
  const [display, setDisplay] = useState(text);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    let iter = 0;
    const total = text.length * 3;
    const scramble = () => {
      setDisplay(
        text.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor(iter / 3)) return ch;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join(''),
      );
      iter++;
      if (iter <= total) rafRef.current = requestAnimationFrame(scramble);
    };
    rafRef.current = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text, active]);
  return display;
}

/* ═══════════════════════════════════════════════════
   SCENE 1 — LIVE STATS
   ═══════════════════════════════════════════════════ */
function SceneStats({ active }: { active: boolean }) {
  const clients = useCountUp(2400, 1800, active);
  const deals   = useCountUp(1200, 2100, active);
  const done    = useCountUp(98,   1500, active);

  const bars = [
    { value: clients, suffix: '+',    label: 'клиентов под управлением', pct: '85%', delay: 0.2 },
    { value: deals,   suffix: ' млн₸', label: 'сделок в воронке',        pct: '74%', delay: 0.35 },
    { value: done,    suffix: '%',     label: 'задач закрыты вовремя',    pct: '98%', delay: 0.5 },
  ];

  return (
    <div className={s.scene}>
      <div className={s.sceneTag}>Kort в цифрах</div>
      <div className={s.statsStack}>
        {bars.map((b) => (
          <motion.div key={b.label} className={s.statRow}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : -18 }}
            transition={{ delay: b.delay, duration: 0.5 }}>
            <div className={s.statNumber}>
              {b.value.toLocaleString('ru')}{b.suffix}
            </div>
            <div className={s.statLabel}>{b.label}</div>
            <div className={s.statTrack}>
              <motion.div className={s.statFill}
                initial={{ width: 0 }}
                animate={{ width: active ? b.pct : 0 }}
                transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: b.delay + 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE 2 — SALES FUNNEL
   ═══════════════════════════════════════════════════ */
const STAGES = [
  { label: 'Лиды',          count: 320, color: '#F59E0B', pct: '100%' },
  { label: 'Квалификация',  count: 210, color: '#F97316', pct:  '78%' },
  { label: 'Переговоры',    count: 118, color: '#EF4444', pct:  '58%' },
  { label: 'КП / Оплата',   count:  47, color: '#22C55E', pct:  '36%' },
];

function SceneFunnel({ active }: { active: boolean }) {
  const conv = useCountUp(147, 1200, active);
  return (
    <div className={s.scene}>
      <div className={s.sceneTag}>Воронка продаж</div>
      <div className={s.funnelList}>
        {STAGES.map((st, i) => (
          <motion.div key={st.label} className={s.funnelItem}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
            transition={{ delay: active ? i * 0.11 : 0, duration: 0.45 }}>
            <div className={s.funnelMeta}>
              <span className={s.funnelLabel}>{st.label}</span>
              <span className={s.funnelCount}>{st.count}</span>
            </div>
            <div className={s.funnelTrack}>
              <motion.div className={s.funnelFill}
                style={{ background: st.color }}
                initial={{ width: 0 }}
                animate={{ width: active ? st.pct : 0 }}
                transition={{ duration: 1.3, ease: [0.34, 1.56, 0.64, 1], delay: active ? i * 0.13 + 0.15 : 0 }}
              />
              <motion.div className={s.funnelGlow}
                style={{ background: st.color }}
                initial={{ width: 0 }}
                animate={{ width: active ? st.pct : 0 }}
                transition={{ duration: 1.3, ease: [0.34, 1.56, 0.64, 1], delay: active ? i * 0.13 + 0.15 : 0 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div className={s.funnelFooter}
        initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }}
        transition={{ delay: 0.7 }}>
        Конверсия в продажу:&nbsp;
        <span className={s.funnelConvNum}>{(conv / 10).toFixed(1)}%</span>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE 3 — CLIENT NETWORK GRAPH
   ═══════════════════════════════════════════════════ */
const NODES = [
  { id: 0, cx: 50, cy: 50, r: 5.5, label: 'Вы',       gold: true  },
  { id: 1, cx: 22, cy: 28, r: 3.5, label: 'ТОО Alpha', gold: false },
  { id: 2, cx: 78, cy: 24, r: 4.0, label: 'ИП Ли',    gold: false },
  { id: 3, cx: 16, cy: 68, r: 3.0, label: 'ООО Beta',  gold: false },
  { id: 4, cx: 83, cy: 67, r: 4.5, label: 'АО Нур',   gold: false },
  { id: 5, cx: 49, cy: 84, r: 3.0, label: 'ТОО Cas',   gold: false },
  { id: 6, cx: 38, cy: 16, r: 2.5, label: 'ИП Мухит', gold: false },
  { id: 7, cx: 64, cy: 43, r: 3.5, label: 'ООО Star',  gold: false },
  { id: 8, cx: 30, cy: 54, r: 2.8, label: 'ИП Алия',  gold: false },
];
const EDGES = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,7],[0,8],[1,6],[2,7],[4,7],[2,4],[1,3],[3,8]];

function SceneNetwork({ active }: { active: boolean }) {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPulse(p => (p + 1) % NODES.length), 900);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className={s.scene}>
      <div className={s.sceneTag}>Сеть клиентов</div>
      <svg viewBox="0 0 100 100" className={s.netSvg} preserveAspectRatio="xMidYMid meet">
        {/* edges */}
        {EDGES.map(([a, b], i) => (
          <motion.line key={i}
            x1={NODES[a].cx} y1={NODES[a].cy}
            x2={NODES[b].cx} y2={NODES[b].cy}
            stroke="rgba(245,158,11,0.22)" strokeWidth="0.35"
            initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }}
            transition={{ delay: active ? i * 0.07 : 0, duration: 0.6 }}
          />
        ))}

        {/* nodes */}
        {NODES.map((nd, i) => (
          <g key={nd.id}>
            {/* ping ring */}
            <motion.circle cx={nd.cx} cy={nd.cy} r={nd.r + 3}
              fill="none" stroke={nd.gold ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.2)'}
              strokeWidth="0.4"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={active ? {
                scale:   [1, pulse === i ? 2 : 1],
                opacity: [0.6, pulse === i ? 0 : 0.3],
              } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
            {/* body */}
            <motion.circle cx={nd.cx} cy={nd.cy} r={nd.r}
              fill={nd.gold ? '#F59E0B' : 'rgba(245,158,11,0.35)'}
              stroke={nd.gold ? '#FBBF24' : 'rgba(245,158,11,0.55)'}
              strokeWidth="0.5"
              initial={{ scale: 0 }}
              animate={{ scale: active ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: active ? i * 0.09 : 0 }}
            />
            {/* label */}
            {nd.r >= 3 && (
              <motion.text x={nd.cx} y={nd.cy + nd.r + 4}
                textAnchor="middle" fontSize="3.2" fill="rgba(240,242,245,0.6)"
                fontFamily="var(--font-body)"
                initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }}
                transition={{ delay: active ? i * 0.1 + 0.4 : 0 }}>
                {nd.label}
              </motion.text>
            )}
          </g>
        ))}
      </svg>
      <motion.div className={s.netCaption}
        initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0 }}
        transition={{ delay: 0.9 }}>
        Все связи, история и сделки — в одном месте
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE 4 — SCRAMBLE HEADLINE
   ═══════════════════════════════════════════════════ */
const PILLS = ['Поиск за 200мс', 'Аудит действий', 'WhatsApp', 'БИН / ИИН'];

function SceneHeadline({ active }: { active: boolean }) {
  const line1 = useTextScramble('Операционный центр', active);
  const line2 = useTextScramble('вашего бизнеса', active);

  return (
    <div className={s.scene}>
      <motion.div className={s.hlTag}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
        transition={{ delay: 0.05 }}>
        Автоматизация ✦
      </motion.div>
      <div className={s.hlTitle}>
        <span className={s.hlWhite}>{line1}</span>
        <br />
        <span className={s.hlGold}>{line2}</span>
      </div>
      <motion.p className={s.hlSub}
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ delay: 0.55 }}>
        Клиенты, сделки, задачи и коммуникации&nbsp;—<br />
        в одной системе. Без хаоса Excel и мессенджеров.
      </motion.p>
      <motion.div className={s.hlPills}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 6 }}
        transition={{ delay: 0.85 }}>
        {PILLS.map((p) => (
          <span key={p} className={s.pill}>{p}</span>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */
const SCENE_NAMES  = ['Статистика', 'Воронка', 'Клиенты', 'Продукт'];
const SCENE_MS     = 5500;

const slide = {
  enter: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show:  { opacity: 1, y:  0, filter: 'blur(0px)' },
  exit:  { opacity: 0, y: -14, filter: 'blur(4px)' },
};

export function AuthPresentation() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scene,    setScene]    = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [key,      setKey]      = useState(0);   // restart progress bar

  useParticles(canvasRef, containerRef);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setScene(s => { const next = (s + 1) % SCENE_NAMES.length; return next; });
      setKey(k => k + 1);
    }, SCENE_MS);
    return () => clearInterval(id);
  }, [autoplay]);

  const goTo = (i: number) => {
    setScene(i);
    setKey(k => k + 1);
    setAutoplay(false);
    const tid = window.setTimeout(() => setAutoplay(true), 12_000);
    return () => clearTimeout(tid);
  };

  return (
    <div ref={containerRef} className={s.root}>
      <canvas ref={canvasRef} className={s.canvas} />

      <div className={s.inner}>
        <AnimatePresence mode="wait">
          <motion.div key={scene}
            variants={slide}
            initial="enter"
            animate="show"
            exit="exit"
            transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
            className={s.sceneBox}>
            {scene === 0 && <SceneStats    active />}
            {scene === 1 && <SceneFunnel   active />}
            {scene === 2 && <SceneNetwork  active />}
            {scene === 3 && <SceneHeadline active />}
          </motion.div>
        </AnimatePresence>

        {/* Progress indicators */}
        <div className={s.dots}>
          {SCENE_NAMES.map((name, i) => (
            <button key={i}
              className={`${s.dot} ${i === scene ? s.dotOn : ''}`}
              onClick={() => goTo(i)}
              aria-label={name}>
              {i === scene && autoplay && (
                <motion.div
                  key={key}
                  className={s.dotProgress}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: SCENE_MS / 1000, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
