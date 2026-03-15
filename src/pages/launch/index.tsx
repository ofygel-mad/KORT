import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuthStore } from '../../shared/stores/auth';
import { KortLogo } from '../../shared/ui/KortLogo';
import s from './LaunchScreen.module.css';

/* ═══════════════════════════════════════════════════════════════
   GLSL — Anamorphic lens flare (horizontal streak from core)
═══════════════════════════════════════════════════════════════ */
const FLARE_V = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FLARE_F = `
uniform float uI;
varying vec2 vUv;
void main(){
  float h = pow(max(1.-abs(vUv.x-.5)*2.05,0.),.60);
  float v = pow(max(1.-abs(vUv.y-.5)*180.,0.),2.2);
  float core = exp(-pow((vUv.x-.5)*3.5,2.))*.5;
  float a = (h*v + core*.15)*uI;
  vec3 c = mix(vec3(1.,.80,.22), vec3(1.,.97,.72), h*h);
  gl_FragColor = vec4(c, a);
}`;

/* ═══════════════════════════════════════════════════════════════
   GLSL — Kawase bloom pass
═══════════════════════════════════════════════════════════════ */
const BLOOM_V = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}`;
const BLOOM_F = `
uniform sampler2D uT; uniform vec2 uR; uniform float uS;
varying vec2 vUv;
vec4 k(float d){
  vec2 p=1./uR;
  return(texture2D(uT,vUv+vec2(d,d)*p)+texture2D(uT,vUv+vec2(-d,d)*p)
        +texture2D(uT,vUv+vec2(d,-d)*p)+texture2D(uT,vUv+vec2(-d,-d)*p))*.25;
}
void main(){
  vec4 b=texture2D(uT,vUv);
  float lum=dot(b.rgb,vec3(.299,.587,.114));
  // High threshold — only genuinely bright areas bloom
  float thresh=smoothstep(.18,.65,lum);
  vec4 gl=(k(1.1)*.44+k(2.6)*.30+k(5.0)*.16+k(8.5)*.10)*uS*thresh;
  gl_FragColor=b+gl;
}`;

/* ═══════════════════════════════════════════════════════════════
   GLSL — Final composite: grain + vignette + filmic tone + fade
═══════════════════════════════════════════════════════════════ */
const POST_V = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}`;
const POST_F = `
uniform sampler2D uT; uniform float uTime,uG,uVig,uFade;
varying vec2 vUv;
float rng(vec2 p){return fract(sin(dot(p+uTime*.0013,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec4 c=texture2D(uT,vUv);
  float g=(rng(vUv)-.5)*uG;
  float vd=distance(vUv,vec2(.5));
  float vig=1.-smoothstep(.30,.88,vd)*uVig;
  c.rgb=(c.rgb+g)*vig;
  // Filmic tone map
  c.rgb=pow(c.rgb/(c.rgb+.18)*1.28, vec3(.95));
  gl_FragColor=vec4(c.rgb,uFade);
}`;

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const lerp         = (a:number,b:number,t:number)=>a+(b-a)*t;
const clamp        = (v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
const easeInExpo   = (t:number)=>t===0?0:Math.pow(2,10*t-10);
const easeOutExpo  = (t:number)=>t===1?1:1-Math.pow(2,-10*t);
const easeInOutC   = (t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const fmt2         = (n:number)=>(n>=0?'+':'')+n.toFixed(2);

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const LABELS = [
  'ERP','CRM','ИИ-ассистент','Автоматизация',
  'Аналитика','API','Документы','Сделки',
  'Клиенты','Задачи','Интеграции','Отчёты',
];
// Pre-seeded hex IDs for technical labels
const NODE_IDS = [
  '0x2F4','0x7A1','0x3E8','0xB5C','0x91F',
  '0x44D','0xC72','0x05A','0x6B3','0xF1E','0x28C',
];

interface OrbitDef { r:number; tilt:THREE.Euler; spd:number; count:number; sz:[number,number] }
const ORBITS:OrbitDef[] = [
  {r:1.80, tilt:new THREE.Euler(.36,.08,.00), spd:.0058, count:3, sz:[.055,.110]},
  {r:3.10, tilt:new THREE.Euler(.28,.20,.06), spd:.0031, count:4, sz:[.040,.085]},
  {r:4.55, tilt:new THREE.Euler(.20,.30,.15), spd:.0017, count:4, sz:[.028,.065]},
];

type Phase = 'idle'|'accel'|'implode'|'burst'|'curtain'|'done';

interface NodeInfo {
  // Three.js objects
  group: THREE.Group;
  outerRing: THREE.Mesh; outerMat: THREE.MeshBasicMaterial;
  innerRing: THREE.Mesh; innerMat: THREE.MeshBasicMaterial;
  ico: THREE.Mesh;       icoMat:   THREE.MeshBasicMaterial;
  dot: THREE.Mesh;       dotMat:   THREE.MeshBasicMaterial;
  // Line + pulse
  lineGeo: THREE.BufferGeometry; lineMat: THREE.LineBasicMaterial;
  pulse: THREE.Mesh; pulseMat: THREE.MeshBasicMaterial;
  pulsePhase: number; pulseSpd: number;
  // Orbit state
  orbit: OrbitDef; angle: number; speed: number;
  drift: THREE.Vector3; driftV: THREE.Vector3;
  icoRotV: THREE.Euler; innerRingSpd: number;
  baseSize: number; baseOp: number;
  // Label
  label: string|null; labelEl: HTMLDivElement|null;
  nodeId: string; syncPct: number;
  lPhase: 'none'|'in'|'hold'|'out';
  lAlpha: number; lProgress: number; lHold: number;
  // Swarm
  swarmVel: THREE.Vector3; swarmA: number;
}

interface CoreParts {
  group: THREE.Group;
  rings: THREE.Mesh[]; ringMats: THREE.MeshBasicMaterial[]; ringSpeeds: number[];
  flareMesh: THREE.Mesh; flareMat: THREE.ShaderMaterial;
  centerDot: THREE.Mesh;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export function LaunchScreen() {
  const mountRef = useRef<HTMLDivElement>(null);
  const glRef    = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene; cam: THREE.PerspectiveCamera;
    core: CoreParts; nodes: NodeInfo[];
    rtA: THREE.WebGLRenderTarget; rtB: THREE.WebGLRenderTarget;
    bloomMat: THREE.ShaderMaterial; postMat: THREE.ShaderMaterial;
    bloomQ: THREE.Mesh; postQ: THREE.Mesh;
    overlay: HTMLDivElement;
    // animation state
    phase: Phase; phaseT: number;
    speedMul: number; radiusMul: number;
    breathPh: number; labelTimer: number;
    fade: number;
  }|null>(null);

  const rafRef   = useRef(0);
  const [ready,  setReady]  = useState(false);
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [flashA, setFlashA] = useState(0);
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);

  /* ── INIT ─────────────────────────────────────────────────── */
  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth, H = mount.clientHeight;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x070605, 1);
    mount.appendChild(renderer.domElement);

    /* Camera */
    const cam = new THREE.PerspectiveCamera(50, W / H, .1, 120);
    cam.position.set(0, .9, 10);
    cam.lookAt(0, 0, 0);

    /* Scene */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070605, .030);

    /* ── Stars ── */
    {
      const geo = new THREE.BufferGeometry();
      const pos: number[] = [], col: number[] = [];
      for (let i = 0; i < 1800; i++) {
        const r = 20 + Math.random() * 26;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos.push(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
        const w = .78 + Math.random() * .22;
        // mix warm and cold stars
        const cold = Math.random() > .7;
        cold ? col.push(w*.75, w*.86, w) : col.push(w, w*.86, w*.55);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
        size: .046, vertexColors: true, transparent: true, opacity: .68, sizeAttenuation: true,
      })));
    }

    /* ══ CORE — Accretion disk system ══ */
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // White-hot center point
    const centerDot = new THREE.Mesh(
      new THREE.SphereGeometry(.065, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),
    );
    coreGroup.add(centerDot);

    // Three torus rings — sizes, tilts, speeds
    const RING_DEF = [
      { r:.62, tube:.013, tilt:new THREE.Euler(Math.PI/2, .04, 0),  spd:.022,  col:0xFFD166, op:.94 },
      { r:.90, tube:.008, tilt:new THREE.Euler(.92, .28, .18),        spd:-.013, col:0xFF9F1C, op:.72 },
      { r:1.28,tube:.005, tilt:new THREE.Euler(1.48,.14,.68),         spd:.007,  col:0xDD6E18, op:.52 },
    ];
    const rings: THREE.Mesh[] = [], ringMats: THREE.MeshBasicMaterial[] = [], ringSpeeds: number[] = [];
    for (const d of RING_DEF) {
      const mat = new THREE.MeshBasicMaterial({
        color: d.col, transparent: true, opacity: d.op,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(d.r, d.tube, 3, 128), mat);
      mesh.rotation.copy(d.tilt);
      coreGroup.add(mesh);
      rings.push(mesh); ringMats.push(mat); ringSpeeds.push(d.spd);
    }

    // Anamorphic lens flare — horizontal streak
    const flareMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 1.0 } },
      vertexShader: FLARE_V, fragmentShader: FLARE_F,
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const flareMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, .10), flareMat);
    coreGroup.add(flareMesh);

    const core: CoreParts = { group: coreGroup, rings, ringMats, ringSpeeds, flareMesh, flareMat, centerDot };

    /* ══ NODES — wireframe data rings ══ */
    const nodes: NodeInfo[] = [];
    let ao = 0, nodeIdx = 0;

    for (const od of ORBITS) {
      const step = Math.PI * 2 / od.count;
      for (let i = 0; i < od.count; i++) {
        const szT   = .25 + Math.random() * .75;
        const sz    = lerp(od.sz[0], od.sz[1], szT);
        const baseOp = lerp(.22, .90, szT);

        const group = new THREE.Group();

        // Outer scanning ring — thin torus, flat (radialSegments=2 = ribbon)
        const outerMat = new THREE.MeshBasicMaterial({
          color: 0xC8902A, transparent: true, opacity: baseOp * .85,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const outerRing = new THREE.Mesh(new THREE.TorusGeometry(sz*2.0, sz*.10, 2, 72), outerMat);
        group.add(outerRing);

        // Inner counter-ring
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0xFFD166, transparent: true, opacity: baseOp * .60,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(sz*1.2, sz*.07, 2, 56), innerMat);
        group.add(innerRing);

        // Wireframe icosahedron — data mesh core
        const icoMat = new THREE.MeshBasicMaterial({
          color: 0xFFD166, wireframe: true, transparent: true, opacity: baseOp * .38,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(sz * .82, 0), icoMat);
        group.add(ico);

        // Central bright dot
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF, transparent: true, opacity: baseOp * .92,
        });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(sz * .18, 6, 6), dotMat);
        group.add(dot);

        scene.add(group);

        // Hub-spoke line
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xAA7820, transparent: true, opacity: .15,
          depthWrite: false, blending: THREE.AdditiveBlending,
        });
        scene.add(new THREE.Line(lineGeo, lineMat));

        // Data pulse — travels center → node
        const pulseMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const pulse = new THREE.Mesh(new THREE.SphereGeometry(.022, 5, 5), pulseMat);
        scene.add(pulse);

        nodes.push({
          group, outerRing, outerMat, innerRing, innerMat, ico, icoMat, dot, dotMat,
          lineGeo, lineMat, pulse, pulseMat,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpd:   .55 + Math.random() * .60,
          orbit: od,
          angle: step * i + ao + (Math.random() - .5) * .55,
          speed: od.spd * (.76 + Math.random() * .48),
          drift:  new THREE.Vector3(),
          driftV: new THREE.Vector3((Math.random()-.5)*.003,(Math.random()-.5)*.003,(Math.random()-.5)*.002),
          icoRotV: new THREE.Euler(
            (Math.random()-.5)*.022,(Math.random()-.5)*.022,(Math.random()-.5)*.016,
          ),
          innerRingSpd: (Math.random() > .5 ? 1 : -1) * (.014 + Math.random() * .009),
          baseSize: sz, baseOp,
          label: null, labelEl: null,
          nodeId:   NODE_IDS[nodeIdx % NODE_IDS.length],
          syncPct:  Math.floor(92 + Math.random() * 7.5),
          lPhase: 'none', lAlpha: 0, lProgress: 0, lHold: 0,
          swarmVel: new THREE.Vector3(), swarmA: 1,
        });
        nodeIdx++;
      }
      ao += .95;
    }

    /* ══ RENDER TARGETS + POST-PROCESS ══ */
    const rtOpts = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType as THREE.TextureDataType,
    };
    const rtA = new THREE.WebGLRenderTarget(W, H, rtOpts);
    const rtB = new THREE.WebGLRenderTarget(W, H, rtOpts);

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const bloomMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: rtA.texture }, uR: { value: new THREE.Vector2(W,H) }, uS: { value: 1.55 } },
      vertexShader: BLOOM_V, fragmentShader: BLOOM_F, depthTest: false, depthWrite: false,
    });
    const postMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: rtB.texture }, uTime: { value: 0 }, uG: { value: .017 }, uVig: { value: 1.45 }, uFade: { value: 1 } },
      vertexShader: POST_V, fragmentShader: POST_F, depthTest: false, depthWrite: false, transparent: true,
    });
    const bloomQ = new THREE.Mesh(quadGeo, bloomMat);
    const postQ  = new THREE.Mesh(quadGeo, postMat);
    scene.userData.bloomQ = bloomQ;
    scene.userData.postQ  = postQ;

    /* Label HTML overlay */
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5;';
    mount.appendChild(overlay);

    /* Store */
    glRef.current = {
      renderer, scene, cam, core, nodes, rtA, rtB,
      bloomMat, postMat, bloomQ, postQ, overlay,
      phase: 'idle', phaseT: 0, speedMul: 1, radiusMul: 1,
      breathPh: 0, labelTimer: 90, fade: 1,
    };

    /* Resize */
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h); cam.aspect = w/h; cam.updateProjectionMatrix();
      rtA.setSize(w, h); rtB.setSize(w, h);
      bloomMat.uniforms.uR.value.set(w, h);
    };
    window.addEventListener('resize', onResize);
    setTimeout(() => setReady(true), 220);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose(); rtA.dispose(); rtB.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(overlay)) mount.removeChild(overlay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── RENDER LOOP ──────────────────────────────────────────── */
  useEffect(() => {
    let lastTs = 0;
    const origin = new THREE.Vector3(0, 0, 0);

    function frame(ts: number) {
      const dt = Math.min(ts - (lastTs || ts), 50);
      lastTs = ts;
      const g = glRef.current;
      if (!g) { rafRef.current = requestAnimationFrame(frame); return; }

      const { renderer, scene, cam, core, nodes, rtA, rtB, bloomMat, postMat, overlay } = g;
      const W = renderer.domElement.clientWidth;
      const H = renderer.domElement.clientHeight;

      postMat.uniforms.uTime.value = ts * .001;
      postMat.uniforms.uFade.value = g.fade;

      /* ── Core heartbeat ── */
      g.breathPh += .052;
      const br = Math.sin(g.breathPh);
      const beat = br > 0 ? Math.pow(br, .46) * .15 : Math.pow(-br, 2.8) * .016;
      const bs = 1 + beat;

      // Rotate accretion rings
      for (let i = 0; i < core.rings.length; i++) {
        core.rings[i].rotation.z += core.ringSpeeds[i] * (g.speedMul * .25 + .75);
      }
      // Flare faces camera but stays horizontal
      core.flareMesh.lookAt(cam.position);
      core.flareMesh.rotation.z = 0;

      /* ── Phase machine ── */
      if (g.phase !== 'idle' && g.phase !== 'done') g.phaseT += dt;

      if (g.phase === 'accel') {
        const t = clamp(g.phaseT / 520, 0, 1);
        g.speedMul = lerp(1, 6.5, easeInExpo(t));
        bloomMat.uniforms.uS.value = lerp(1.55, 3.8, easeInExpo(t));
        cam.position.z = lerp(10, 9, easeInOutC(t));
        core.group.scale.setScalar(bs * lerp(1, 1.3, easeInExpo(t)));
        if (g.phaseT >= 520) { g.phase = 'implode'; g.phaseT = 0; setPhase('implode'); }

      } else if (g.phase === 'implode') {
        // All nodes rush toward centre, core swells
        const t = clamp(g.phaseT / 650, 0, 1);
        g.radiusMul = lerp(1, 0, easeInExpo(t));
        const coreScale = lerp(bs, bs * 2.8, easeInExpo(t));
        core.group.scale.setScalar(coreScale);
        core.flareMat.uniforms.uI.value = lerp(1, 5.5, easeInExpo(t));
        setFlashA(easeInExpo(t) * .38);
        if (g.phaseT >= 650) {
          g.phase = 'burst'; g.phaseT = 0;
          // Assign launch velocities
          for (const nd of nodes) {
            const p = nd.group.position;
            const ang = Math.atan2(p.y, p.x) + (Math.random() - .5) * 1.3;
            nd.swarmVel.set(
              Math.cos(ang) * (1.4 + Math.random() * .9),
              Math.sin(ang) * (1.1 + Math.random() * .8),
              8.5 + Math.random() * 11,   // flies toward camera (positive Z)
            );
            nd.swarmA = 1;
          }
          setPhase('burst');
        }

      } else if (g.phase === 'burst') {
        const t = clamp(g.phaseT / 820, 0, 1);
        for (const nd of nodes) {
          nd.group.position.addScaledVector(nd.swarmVel, .009 * dt);
          // Scale up as they approach camera — bigger = closer = filling frame
          nd.group.scale.setScalar(lerp(1, 6 + nd.baseSize * 20, easeInExpo(t)));
          nd.swarmA = lerp(1, 0, Math.pow(t, 1.3));
          const a = nd.swarmA;
          nd.outerMat.opacity = a * nd.baseOp * .85;
          nd.innerMat.opacity = a * nd.baseOp * .60;
          nd.icoMat.opacity   = a * nd.baseOp * .38;
          nd.dotMat.opacity   = a * nd.baseOp * .92;
          nd.lineMat.opacity  = a * .15;
          nd.pulseMat.opacity = 0;
          if (nd.labelEl) nd.labelEl.style.opacity = '0';
        }
        // Core collapses
        core.group.scale.setScalar(lerp(bs * 2.8, 0, easeOutExpo(t)));
        setFlashA(lerp(.38, .95, easeInExpo(t)));
        if (g.phaseT >= 750) { g.phase = 'curtain'; g.phaseT = 0; setPhase('curtain'); }

      } else if (g.phase === 'curtain') {
        const t = clamp(g.phaseT / 560, 0, 1);
        setFlashA(lerp(.95, 0, t));
        g.fade = lerp(1, 0, easeInExpo(t));
        if (g.phaseT >= 500) { g.phase = 'done'; setPhase('done'); }

      } else {
        // idle: normal core scale with heartbeat
        core.group.scale.setScalar(bs);
      }

      /* ── Idle: orbits, labels, pulses ── */
      if (g.phase === 'idle' || g.phase === 'accel') {

        /* Label churn */
        if (g.phase === 'idle') {
          g.labelTimer--;
          if (g.labelTimer <= 0) {
            const hold = nodes.filter(n => n.lPhase === 'hold');
            if (hold.length) hold[Math.floor(Math.random() * hold.length)].lPhase = 'out';
            const none = nodes.filter(n => n.lPhase === 'none');
            if (none.length) {
              const tgt  = none[Math.floor(Math.random() * none.length)];
              const shown = new Set(nodes.map(n => n.label).filter(Boolean));
              const avail = LABELS.filter(l => !shown.has(l));
              if (avail.length) {
                tgt.label   = avail[Math.floor(Math.random() * avail.length)];
                tgt.lPhase  = 'in'; tgt.lAlpha = 0; tgt.lProgress = 0;
                if (!tgt.labelEl) {
                  const el = document.createElement('div');
                  el.className = s.dataLabel;
                  overlay.appendChild(el);
                  tgt.labelEl = el;
                }
              }
            }
            g.labelTimer = 52 + Math.floor(Math.random() * 95);
          }

          for (const nd of nodes) {
            if (nd.lPhase === 'in') {
              nd.lProgress = Math.min(1, nd.lProgress + .038);
              nd.lAlpha    = Math.min(1, nd.lAlpha    + .055);
              if (nd.lProgress >= 1) { nd.lPhase = 'hold'; nd.lHold = 1900 + Math.random() * 2600; }
            } else if (nd.lPhase === 'hold') {
              nd.lHold -= dt;
              if (nd.lHold <= 0) nd.lPhase = 'out';
            } else if (nd.lPhase === 'out') {
              nd.lAlpha    = Math.max(0, nd.lAlpha    - .044);
              nd.lProgress = Math.max(0, nd.lProgress - .052);
              if (nd.lAlpha <= 0) {
                nd.lPhase = 'none'; nd.label = null; nd.lProgress = 0;
                if (nd.labelEl) nd.labelEl.style.opacity = '0';
              }
            }
          }
        }

        /* Node orbit positions + animations */
        for (let i = 0; i < nodes.length; i++) {
          const nd = nodes[i];
          nd.angle += nd.speed * g.speedMul;

          // Smooth Brownian float — "floating" feel, not shaking
          nd.driftV.x += (Math.random() - .5) * .00022;
          nd.driftV.y += (Math.random() - .5) * .00018;
          nd.driftV.z += (Math.random() - .5) * .00014;
          nd.driftV.multiplyScalar(.975);
          nd.drift.add(nd.driftV);
          nd.drift.multiplyScalar(.9955);

          // Tilted ellipse with genuine Z depth
          const r = nd.orbit.r * g.radiusMul;
          const raw = new THREE.Vector3(
            Math.cos(nd.angle) * r,
            Math.sin(nd.angle) * r * .27,     // vertical compression
            Math.sin(nd.angle + .55) * r * .20, // Z variation — creates 3D feel
          );
          raw.applyEuler(nd.orbit.tilt);
          nd.group.position.copy(raw).add(nd.drift);

          // Always face camera
          nd.group.lookAt(cam.position);

          // Independent rotations
          nd.ico.rotation.x += nd.icoRotV.x;
          nd.ico.rotation.y += nd.icoRotV.y;
          nd.ico.rotation.z += nd.icoRotV.z;
          nd.innerRing.rotation.z += nd.innerRingSpd;
          nd.outerRing.rotation.z += nd.innerRingSpd * .28; // slower outer

          // Depth-based visibility (nodes behind core are dimmer)
          const depthN = clamp((nd.group.position.z + 5) / 10, 0, 1);
          nd.outerMat.opacity = lerp(nd.baseOp * .18, nd.baseOp * .85, depthN) * g.fade;
          nd.innerMat.opacity = lerp(nd.baseOp * .12, nd.baseOp * .62, depthN) * g.fade;
          nd.icoMat.opacity   = lerp(nd.baseOp * .08, nd.baseOp * .38, depthN) * g.fade;
          nd.dotMat.opacity   = lerp(nd.baseOp * .22, nd.baseOp * .92, depthN) * g.fade;
          nd.lineMat.opacity  = lerp(.04, .22, depthN) * g.fade;

          // Update spoke line
          const pts = nd.lineGeo.attributes.position as THREE.BufferAttribute;
          pts.setXYZ(0, 0, 0, 0);
          pts.setXYZ(1, nd.group.position.x, nd.group.position.y, nd.group.position.z);
          pts.needsUpdate = true;

          // Animate data pulse — travels from hub to node
          nd.pulsePhase += nd.pulseSpd * .001 * dt;
          const pT = (Math.sin(nd.pulsePhase) + 1) / 2; // 0→1→0
          nd.pulse.position.lerpVectors(origin, nd.group.position, pT);
          // Only visible in the "outbound" half of the sine wave
          const pVisible = Math.sin(nd.pulsePhase);
          nd.pulseMat.opacity = Math.max(0, pVisible) * depthN * .80 * g.fade;

          /* ── CSS label with technical data ── */
          if (nd.labelEl && nd.label) {
            const chars  = nd.label.split('');
            const reveal = Math.round(nd.lProgress * chars.length);
            const text   = chars.slice(0, reveal).join('');
            // Show actual 3D coordinates for that "data density" feel
            const px = nd.group.position.x, pz = nd.group.position.z;
            nd.labelEl.innerHTML =
              `<span class="${s.lName}">◈ ${text}</span>` +
              `<span class="${s.lMeta}">${nd.nodeId} · SYN:${nd.syncPct}%</span>` +
              `<span class="${s.lCoord}">x:${fmt2(px)} z:${fmt2(pz)}</span>`;

            const v  = nd.group.position.clone().project(cam);
            const sx = (v.x *  .5 + .5) * W;
            const sy = (v.y * -.5 + .5) * H;
            nd.labelEl.style.left      = `${sx}px`;
            nd.labelEl.style.top       = `${sy + nd.baseSize * 65 + 16}px`;
            nd.labelEl.style.opacity   = String(nd.lAlpha * g.fade);
            nd.labelEl.style.transform = 'translateX(-50%)';
          }
        }
      }

      /* ── 3-pass render pipeline ── */
      // Pass 1: 3D scene → rtA
      renderer.setRenderTarget(rtA);
      renderer.clear();
      renderer.render(scene, cam);

      // Pass 2: Bloom — rtA → rtB
      const bScene = new THREE.Scene();
      bScene.add(scene.userData.bloomQ);
      renderer.setRenderTarget(rtB);
      renderer.clear();
      renderer.render(bScene, new THREE.OrthographicCamera(-1,1,1,-1,0,1));

      // Pass 3: Final composite → screen
      const pScene = new THREE.Scene();
      pScene.add(scene.userData.postQ);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(pScene, new THREE.OrthographicCamera(-1,1,1,-1,0,1));

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Navigate on done ────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => {
      // TODO: replace with real API auth call
      setAuth(
        { id:'demo', full_name:'Пользователь', email:'demo@kort.kz' },
        { id:'demo-org', name:'Kort Demo', slug:'demo', mode:'basic', currency:'KZT', onboarding_completed:true },
        'demo-token', 'demo-refresh', ['*'], 'owner',
      );
      navigate('/', { replace: true });
    }, 280);
    return () => clearTimeout(t);
  }, [phase, navigate, setAuth]);

  const handleLaunch = useCallback(() => {
    const g = glRef.current;
    if (g && g.phase === 'idle') { g.phase = 'accel'; g.phaseT = 0; setPhase('accel'); }
  }, []);

  return (
    <div className={s.root}>
      <div ref={mountRef} className={s.mount} />

      <div className={`${s.logo} ${ready ? s.logoIn : ''}`}>
        <KortLogo size={36} />
        <span className={s.logoName}>Kort</span>
      </div>

      <div className={`${s.btnWrap} ${ready ? s.btnWrapIn : ''}`}>
        <button
          className={`${s.btn} ${phase !== 'idle' ? s.btnFiring : ''}`}
          onClick={handleLaunch}
          disabled={phase !== 'idle'}
          aria-label="Запустить систему"
        >
          <span className={s.ring1} />
          <span className={s.ring2} />
          <span className={s.ring3} />
          <span className={s.btnLabel}>Запуск</span>
        </button>
        <p className={`${s.sub} ${phase !== 'idle' ? s.subHide : ''}`}>
          Инициализация системы
        </p>
      </div>

      {flashA > .01 && <div className={s.flash} style={{ opacity: flashA }} />}
      {(phase === 'curtain' || phase === 'done') && <div className={s.curtain} />}
    </div>
  );
}
