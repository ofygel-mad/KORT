import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {
  WorkspaceSceneTheme,
} from '../model/types';
import {
  WORKSPACE_SCENE_FLIGHT_TILE_TUNING,
  WORKSPACE_SCENE_THEMES,
  WORKSPACE_SCENE_VISUAL_TUNING,
  getThemeByTime,
} from './sceneConfig';
import {
  _scratchColor,
  clamp,
  lerpColor,
  createCircularTerrainGeometry,
  createSkyMaterial,
  createHazeMaterial,
  createMistMaterial,
  createBoundaryFogMaterial,
  createTerrainFogMaterial,
  createSoftDotTexture,
} from './sceneHelpers';
import { computeLightningFlash, resolveThemeAtmosphere } from './sceneEffects';
import { buildPeakBeaconField, createPeakBeaconMaterial } from './sceneTerrain';
import {
  FLIGHT_POINTER_EASING,
  MOVEMENT_CODES,
  PARTICLE_COUNT,
  RAIN_COUNT,
  SURFACE_POINTER_EASING,
  TERRAIN_FOG_INNER_RADIUS,
  TERRAIN_FOG_OUTER_RADIUS,
  TERRAIN_RADIUS,
  TERRAIN_SEGMENTS_FLIGHT,
  TERRAIN_SEGMENTS_SURFACE,
  TERRAIN_Y_OFFSET,
  WORLD_UP,
} from './sceneConstants';
import { WorkspaceSceneTerrainController } from './sceneTerrainController';
import { WorkspaceSceneShellController } from './sceneShellController';
import { WorkspaceSceneCameraController } from './sceneCameraController';
export type {
  WorkspaceSceneFlightTileProjection,
  WorkspaceSceneTileDescriptor,
  WorkspaceSceneRuntimeState,
  WorkspaceSceneRuntimeOptions,
} from './sceneTypes';
import type {
  WorkspaceSceneRuntimeState,
  WorkspaceSceneRuntimeOptions,
  ImpactWave,
  ShellRuntime,
  WorkspaceSceneFlightTileProjection,
  WorkspaceSceneTileDescriptor,
} from './sceneTypes';

type FlightTileAnchorRuntime = {
  descriptor: WorkspaceSceneTileDescriptor;
  wallAngleOffset: number;
  wallHeight: number;
  sourceLocalX: number;
  sourceLocalY: number;
  sourceLift: number;
  bandScale: number;
  bandOpacity: number;
  bandBlur: number;
  bandOrder: number;
};

function buildTerrainLOD(segments: number) {
  const geometry = createCircularTerrainGeometry(TERRAIN_RADIUS, segments, segments);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const baseX = new Float32Array(positions.count);
  const baseY = new Float32Array(positions.count);
  const initialZ = new Float32Array(positions.count);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const radialDistance = Math.hypot(x, y);
    const edgeBlend = THREE.MathUtils.smoothstep(radialDistance, TERRAIN_RADIUS * 0.7, TERRAIN_RADIUS);
    const z = (Math.random() - 0.5) * (3.8 - edgeBlend * 2.2) - edgeBlend * 9.5;

    baseX[index] = x;
    baseY[index] = y;
    initialZ[index] = z;
    positions.setZ(index, z);
  }

  geometry.computeVertexNormals();
  return { geometry, positions, baseX, baseY, initialZ };
}

export class WorkspaceSceneRuntime {
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 1800);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: UnrealBloomPass;
  private readonly clock = new THREE.Clock();
  private readonly terrainGroup = new THREE.Group();
  private readonly shellGroup = new THREE.Group();
  private readonly pointer = new THREE.Vector2(0, 0);
  private readonly pointerTarget = new THREE.Vector2(0, 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly fogInteractionPoints = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private readonly fogInteractionWeights = [0, 0, 0];
  private readonly invisiblePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600, 1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  private readonly hemiLight = new THREE.HemisphereLight(0xffffff, 0x223040, 0.38);
  private readonly mainLight = new THREE.DirectionalLight(0xffffff, 0.78);
  private readonly accentLight = new THREE.DirectionalLight(0xffffff, 0.22);
  private readonly skyDome: THREE.Mesh;
  private readonly horizonMesh: THREE.Mesh;
  private readonly mistMesh: THREE.Mesh;
  private readonly boundaryFog: THREE.Mesh;
  private readonly terrainFogLayer: THREE.Mesh;
  private readonly lightningOverlay: HTMLDivElement;
  private readonly bodyGeometry = new RoundedBoxGeometry(1, 1, 1, 6, 0.08);
  private readonly panelGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  private readonly shadowGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  private readonly bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.08,
    roughness: 0.28,
    metalness: 0.44,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    transparent: true,
    opacity: 0.82,
    transmission: 0.08,
  });
  private readonly softDotTexture = createSoftDotTexture();
  private readonly ambientParticles: THREE.Points;
  private readonly particleVelocities: THREE.Vector3[] = [];
  private readonly particleBaseVelocities: THREE.Vector3[] = [];
  private readonly rain: THREE.LineSegments;
  private readonly rainGeometry: THREE.BufferGeometry;
  private readonly rainDrops = new Float32Array(RAIN_COUNT * 3);
  private readonly rainVelocity = new Float32Array(RAIN_COUNT);
  private readonly rainDrift = new Float32Array(RAIN_COUNT);
  private readonly rainLength = new Float32Array(RAIN_COUNT);
  private readonly rainPhase = new Float32Array(RAIN_COUNT);
  private readonly rainSwing = new Float32Array(RAIN_COUNT);
  private readonly rainDepth = new Float32Array(RAIN_COUNT);
  private surfaceTerrainGeometry: THREE.BufferGeometry;
  private flightTerrainGeometry: THREE.BufferGeometry;
  private surfacePositions: THREE.BufferAttribute;
  private surfaceBaseX: Float32Array;
  private surfaceBaseY: Float32Array;
  private surfaceInitialZ: Float32Array;
  private flightPositions: THREE.BufferAttribute;
  private flightBaseX: Float32Array;
  private flightBaseY: Float32Array;
  private flightInitialZ: Float32Array;
  private readonly surface: THREE.Mesh;
  private readonly wireframe: THREE.Mesh;
  private readonly glowWireframe: THREE.Mesh;
  private readonly surfacePoints: THREE.Points;
  private readonly peakBeacons: THREE.Points;
  private readonly peakBeaconMaterial: THREE.ShaderMaterial;
  private readonly peakBeaconPositions: THREE.BufferAttribute;
  private readonly peakBeaconIntensity: THREE.BufferAttribute;
  private readonly peakBeaconColor = new THREE.Color();
  private readonly shells = new Map<string, ShellRuntime>();
  private readonly flightTileAnchors = new Map<string, FlightTileAnchorRuntime>();
  private readonly waves: ImpactWave[] = [];
  private readonly pointerWorldPosition = new THREE.Vector3();
  private readonly flightTileSourcePoint = new THREE.Vector3();
  private readonly flightTileSourceNormal = new THREE.Vector3();
  private readonly flightTileTargetPoint = new THREE.Vector3();
  private readonly flightTileProjectedPoint = new THREE.Vector3();
  private readonly flightTileClipPoint = new THREE.Vector3();
  private readonly localCameraPosition = new THREE.Vector3();
  private readonly localForwardPoint = new THREE.Vector3();
  private readonly localForwardDirection = new THREE.Vector3();
  private readonly projectedFlightTiles: WorkspaceSceneFlightTileProjection[] = [];
  private readonly sharedColorA = new THREE.Color();
  private readonly sharedColorB = new THREE.Color();
  private readonly neonEdgeThemeColor = new THREE.Color();
  private readonly neonEdgeTargetColor = new THREE.Color();
  private readonly wireShiftColorA = new THREE.Color();
  private readonly wireShiftColorB = new THREE.Color();
  private readonly wireShiftColorC = new THREE.Color();
  private readonly terrainFillColor = new THREE.Color();
  private readonly terrainWireColor = new THREE.Color();
  private readonly terrainGlowColor = new THREE.Color();
  private readonly terrainPointColor = new THREE.Color();
  private readonly particleColor = new THREE.Color();
  private readonly bodyColor = new THREE.Color();
  private readonly bodyEmissiveColor = new THREE.Color();
  private readonly terrainController: WorkspaceSceneTerrainController;
  private readonly shellController: WorkspaceSceneShellController;
  private readonly cameraController: WorkspaceSceneCameraController;
  private readonly backgroundStyle = { skyTop: '', skyBottom: '' };
  private frameHandle = 0;
  private themeTarget = WORKSPACE_SCENE_THEMES.default;
  private state: WorkspaceSceneRuntimeState = {
    theme: 'default',
    themeAuto: false,
    flightMode: false,
    terrainMode: 'full',
    tiles: [],
  };
  private lastResolvedTimeTheme: WorkspaceSceneTheme = getThemeByTime();
  private dragging = false;
  private activePointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerInfluenceActive = false;
  private lightningProgress = 0;
  private nextLightningAt = 30;
  private frameCount = 0;
  private mounted = true;
  private readonly onShellHover: ((tileId: string | null) => void) | null = null;
  private readonly onShellActivate: ((tileId: string) => void) | null = null;
  private readonly onFlightTileProjection: ((tiles: WorkspaceSceneFlightTileProjection[]) => void) | null = null;
  private pointerDownShellId: string | null = null;
  private pointerDragDistance = 0;
  private flightTileBlend = 0;
  private flightTileWallYaw = 0;
  private flightTileWallTargetYaw = 0;
  // ── Cinematic theme transition state ───────────────────────────────────────
  private hasFirstStateApplied = false;
  private transitionActive = false;
  private transitionT = 0;
  private readonly transitionDuration = 3.8;
  private transitionFromTheme = WORKSPACE_SCENE_THEMES.morning;

  constructor(options: WorkspaceSceneRuntimeOptions) {
    this.canvas = options.canvas;
    this.host = options.host;
    this.onShellHover = options.onShellHover ?? null;
    this.onShellActivate = options.onShellActivate ?? null;
    this.onFlightTileProjection = options.onFlightTileProjection ?? null;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.themeTarget.exposure;
    this.renderer.setClearColor(0x000000, 0);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), this.themeTarget.bloomStrength, 0.3, 0.6);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);

    this.scene.fog = new THREE.FogExp2(this.themeTarget.fog, this.themeTarget.fogDensity);

    this.lightningOverlay = document.createElement('div');
    this.lightningOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      opacity: 0;
      mix-blend-mode: screen;
      background:
        radial-gradient(circle at 50% 24%, rgba(232,243,255,0.9) 0%, rgba(232,243,255,0.35) 22%, rgba(232,243,255,0.08) 48%, rgba(232,243,255,0) 74%),
        linear-gradient(180deg, rgba(228,240,255,0.55) 0%, rgba(228,240,255,0.18) 38%, rgba(228,240,255,0) 100%);
      transition: opacity 40ms linear;
    `;
    this.host.appendChild(this.lightningOverlay);

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(600, 20, 10), createSkyMaterial(this.themeTarget));
    this.scene.add(this.skyDome);

    this.horizonMesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 78, 1, 1), createHazeMaterial(this.themeTarget));
    this.horizonMesh.position.set(0, 3.4, -115);
    this.scene.add(this.horizonMesh);

    this.mistMesh = new THREE.Mesh(new THREE.PlaneGeometry(560, 96, 1, 1), createMistMaterial(this.themeTarget));
    this.mistMesh.position.set(0, 8.8, -150);
    this.scene.add(this.mistMesh);

    // Build high-res geometry for surface mode and low-res for flight mode
    const surfaceLOD = buildTerrainLOD(TERRAIN_SEGMENTS_SURFACE);
    this.surfaceTerrainGeometry = surfaceLOD.geometry;
    this.surfacePositions = surfaceLOD.positions;
    this.surfaceBaseX = surfaceLOD.baseX;
    this.surfaceBaseY = surfaceLOD.baseY;
    this.surfaceInitialZ = surfaceLOD.initialZ;

    const flightLOD = buildTerrainLOD(TERRAIN_SEGMENTS_FLIGHT);
    this.flightTerrainGeometry = flightLOD.geometry;
    this.flightPositions = flightLOD.positions;
    this.flightBaseX = flightLOD.baseX;
    this.flightBaseY = flightLOD.baseY;
    this.flightInitialZ = flightLOD.initialZ;

    // Start in surface mode
    const geometry = this.surfaceTerrainGeometry;

    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: this.themeTarget.terrainFill,
      emissive: this.themeTarget.terrainEmissive,
      emissiveIntensity: this.themeTarget.emissiveIntensity,
      roughness: this.themeTarget.meshRoughness,
      metalness: this.themeTarget.meshMetalness,
      flatShading: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    });
    this.surface = new THREE.Mesh(geometry, surfaceMaterial);

    this.wireframe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: this.themeTarget.terrainWire,
      wireframe: true,
      transparent: true,
      opacity: this.themeTarget.wireOpacity,
      blending: THREE.NormalBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -6,
    }));
    // Tiny uniform scale geometrically separates wireframe from surface, eliminating z-fighting
    this.wireframe.scale.setScalar(1.0028);
    this.wireframe.renderOrder = 1;

    this.glowWireframe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: this.themeTarget.terrainGlow,
      wireframe: true,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -9,
    }));
    this.glowWireframe.scale.setScalar(1.0038);
    this.glowWireframe.renderOrder = 2;

    this.surfacePoints = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: this.themeTarget.terrainPoints,
      size: 0.058,
      transparent: true,
      opacity: this.themeTarget.pointsOpacity,
      alphaMap: this.softDotTexture,
      alphaTest: 0.08,
      blending: THREE.NormalBlending,
      depthWrite: false,
    }));

    const peakBeaconField = buildPeakBeaconField(this.surfaceBaseX, this.surfaceBaseY, TERRAIN_RADIUS);
    const peakBeaconGeometry = new THREE.BufferGeometry();
    this.peakBeaconPositions = new THREE.BufferAttribute(peakBeaconField.positions, 3);
    this.peakBeaconIntensity = new THREE.BufferAttribute(peakBeaconField.intensity, 1);
    peakBeaconGeometry.setAttribute('position', this.peakBeaconPositions);
    peakBeaconGeometry.setAttribute('aIntensity', this.peakBeaconIntensity);
    peakBeaconGeometry.setAttribute('aSeed', new THREE.BufferAttribute(peakBeaconField.seeds, 1));
    this.peakBeaconMaterial = createPeakBeaconMaterial(this.themeTarget.terrainBeacon);
    this.peakBeacons = new THREE.Points(peakBeaconGeometry, this.peakBeaconMaterial);
    this.peakBeacons.renderOrder = 4;
    this.peakBeacons.visible = false;

    this.boundaryFog = new THREE.Mesh(
      new THREE.RingGeometry(TERRAIN_FOG_INNER_RADIUS, TERRAIN_FOG_OUTER_RADIUS, 64, 1),
      createBoundaryFogMaterial(this.themeTarget, TERRAIN_FOG_INNER_RADIUS, TERRAIN_FOG_OUTER_RADIUS),
    );
    this.boundaryFog.position.z = 5.8;
    this.boundaryFog.visible = false;

    this.terrainFogLayer = new THREE.Mesh(
      new THREE.CircleGeometry(TERRAIN_RADIUS * 1.02, 64),
      createTerrainFogMaterial(this.themeTarget, this.fogInteractionPoints, this.fogInteractionWeights),
    );
    this.terrainFogLayer.position.z = 8.6;

    this.terrainGroup.add(
      this.surface,
      this.wireframe,
      this.glowWireframe,
      this.surfacePoints,
      this.peakBeacons,
      this.boundaryFog,
      this.terrainFogLayer,
    );
    this.terrainGroup.rotation.x = -Math.PI / 2.12;
    this.terrainGroup.position.y = TERRAIN_Y_OFFSET;
    this.scene.add(this.terrainGroup);

    this.invisiblePlane.rotation.x = -Math.PI / 2.12;
    this.invisiblePlane.position.y = TERRAIN_Y_OFFSET;
    this.scene.add(this.invisiblePlane);
    this.scene.add(this.shellGroup);

    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const i3 = index * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 200;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 30 + 10;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 100;

      const velocity = new THREE.Vector3(
        -(Math.random() * 0.04 + 0.01),
        Math.random() * 0.01 + 0.005,
        Math.random() * 0.02 + 0.01,
      );
      this.particleVelocities.push(velocity.clone());
      this.particleBaseVelocities.push(velocity.clone());
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    this.ambientParticles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      color: this.themeTarget.particles,
      size: 0.16,
      transparent: true,
      opacity: 0.6,
      alphaMap: this.softDotTexture,
      alphaTest: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.scene.add(this.ambientParticles);

    const rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
    for (let index = 0; index < RAIN_COUNT; index += 1) {
      const i3 = index * 3;
      this.rainDrops[i3] = (Math.random() - 0.5) * 220;
      this.rainDrops[i3 + 1] = Math.random() * 120 + 10;
      this.rainDrops[i3 + 2] = (Math.random() - 0.5) * 220;
      this.rainVelocity[index] = 18 + Math.random() * 14;
      this.rainDrift[index] = 1.6 + Math.random() * 2.2;
      this.rainLength[index] = 0.32 + Math.random() * 0.9;
      this.rainPhase[index] = Math.random() * Math.PI * 2;
      this.rainSwing[index] = 0.12 + Math.random() * 0.38;
      this.rainDepth[index] = 0.5 + Math.random() * 0.95;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.LineSegments(this.rainGeometry, new THREE.LineBasicMaterial({
      color: this.themeTarget.horizon,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }));
    this.scene.add(this.rain);

    this.mainLight.position.set(-18, 34, 12);
    this.accentLight.position.set(22, 16, -10);
    this.scene.add(this.ambientLight, this.hemiLight, this.mainLight, this.accentLight);

    this.camera.position.set(0, 12.8, 72);
    this.camera.lookAt(0, 3.2, 0);

    this.canvas.style.cursor = 'grab';
    this.canvas.style.touchAction = 'none';
    this.backgroundStyle.skyTop = this.themeTarget.skyTop;
    this.backgroundStyle.skyBottom = this.themeTarget.skyBottom;

    this.terrainController = new WorkspaceSceneTerrainController({
      camera: this.camera,
      terrainGroup: this.terrainGroup,
      surface: this.surface,
      invisiblePlane: this.invisiblePlane,
      raycaster: this.raycaster,
      positions: this.surfacePositions,
      baseX: this.surfaceBaseX,
      baseY: this.surfaceBaseY,
      initialZ: this.surfaceInitialZ,
      fogInteractionPoints: this.fogInteractionPoints,
      fogInteractionWeights: this.fogInteractionWeights,
      waves: this.waves,
      shells: this.shells,
      pointer: this.pointer,
      peakBeaconIndices: peakBeaconField.indices,
      peakBeaconPositionsAttribute: this.peakBeaconPositions,
      peakBeaconIntensityAttribute: this.peakBeaconIntensity,
      getPointerInfluenceActive: () => this.pointerInfluenceActive,
      getState: () => this.state,
      getFrameCount: () => this.frameCount,
    });
    this.shellController = new WorkspaceSceneShellController({
      shells: this.shells,
      shellGroup: this.shellGroup,
      bodyGeometry: this.bodyGeometry,
      panelGeometry: this.panelGeometry,
      shadowGeometry: this.shadowGeometry,
      bodyMaterial: this.bodyMaterial,
      softDotTexture: this.softDotTexture,
      clock: this.clock,
      camera: this.camera,
      mainLight: this.mainLight,
      getThemeTarget: () => this.themeTarget,
      getState: () => this.state,
      getFlightIdleBlend: () => this.cameraController.getFlightIdleBlend(),
      onShellHover: this.onShellHover ?? undefined,
      timeFromIso: (value) => this.timeFromIso(value),
      terrainController: this.terrainController,
    });
    this.cameraController = new WorkspaceSceneCameraController({
      camera: this.camera,
      clock: this.clock,
      terrainGroup: this.terrainGroup,
      shells: this.shells,
      pointer: this.pointer,
      getState: () => this.state,
      getDragging: () => this.dragging,
      terrainController: this.terrainController,
    });
    this.cameraController.initializeFromCamera();

    this.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.host.addEventListener('pointerdown', this.handleHostPointerDown);
    window.addEventListener('pointermove', this.handleWindowPointerMove);
    window.addEventListener('pointerup', this.handleWindowPointerUp);
    window.addEventListener('pointercancel', this.handleWindowPointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    this.animate();
  }

  getBackgroundStyle() {
    return this.backgroundStyle;
  }

  resize(width: number, height: number) {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.composer.setSize(safeWidth, safeHeight);
    // Render bloom at half resolution for significant GPU savings
    this.bloomPass.setSize(Math.ceil(safeWidth / 2), Math.ceil(safeHeight / 2));
  }

  setState(nextState: WorkspaceSceneRuntimeState) {
    const previous = this.state;
    this.state = nextState;

    const resolvedTheme = nextState.themeAuto ? getThemeByTime() : nextState.theme;
    this.lastResolvedTimeTheme = resolvedTheme;
    this.triggerThemeTransition(WORKSPACE_SCENE_THEMES[resolvedTheme]);
    this.hasFirstStateApplied = true;

    if (previous.flightMode !== nextState.flightMode) {
      this.applyFlightMode(nextState.flightMode);
    }

    if (previous.terrainMode !== nextState.terrainMode) {
      this.terrainController.setTerrainMode(nextState.terrainMode, this.clock.elapsedTime);
    }

    this.shellController.syncShells([]);
    this.rebuildFlightTileAnchors(nextState.tiles);

    if (!previous.tiles.length && nextState.tiles.length && !nextState.flightMode) {
      this.cameraController.placeHeroEntry();
    }
  }

  dispose() {
    this.mounted = false;
    cancelAnimationFrame(this.frameHandle);
    this.onFlightTileProjection?.([]);

    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.host.removeEventListener('pointerdown', this.handleHostPointerDown);
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    window.removeEventListener('pointerup', this.handleWindowPointerUp);
    window.removeEventListener('pointercancel', this.handleWindowPointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    this.shellController.disposeAll();

    this.bodyGeometry.dispose();
    this.panelGeometry.dispose();
    this.shadowGeometry.dispose();
    this.softDotTexture.dispose();
    this.renderer.dispose();
    this.composer.dispose();
    if (this.lightningOverlay.parentElement === this.host) {
      this.host.removeChild(this.lightningOverlay);
    }
    (this.skyDome.geometry as THREE.BufferGeometry).dispose();
    (this.skyDome.material as THREE.Material).dispose();
    this.surfaceTerrainGeometry.dispose();
    this.flightTerrainGeometry.dispose();
    (this.surface.material as THREE.Material).dispose();
    (this.wireframe.material as THREE.Material).dispose();
    (this.glowWireframe.material as THREE.Material).dispose();
    (this.surfacePoints.material as THREE.Material).dispose();
    (this.peakBeacons.geometry as THREE.BufferGeometry).dispose();
    (this.peakBeacons.material as THREE.Material).dispose();
    (this.boundaryFog.geometry as THREE.BufferGeometry).dispose();
    (this.boundaryFog.material as THREE.Material).dispose();
    (this.terrainFogLayer.geometry as THREE.BufferGeometry).dispose();
    (this.terrainFogLayer.material as THREE.Material).dispose();
    (this.ambientParticles.geometry as THREE.BufferGeometry).dispose();
    (this.ambientParticles.material as THREE.Material).dispose();
    this.rainGeometry.dispose();
    (this.rain.material as THREE.Material).dispose();
    this.bodyMaterial.dispose();
    (this.horizonMesh.material as THREE.Material).dispose();
    (this.mistMesh.material as THREE.Material).dispose();
  }

  private readonly handleCanvasPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    this.dragging = true;
    this.activePointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.pointerDragDistance = 0;
    this.pointerDownShellId = null;
    this.canvas.style.cursor = 'grabbing';
    this.canvas.setPointerCapture(event.pointerId);
    if (this.state.flightMode) {
      this.cameraController.markInteraction();
    }
    event.preventDefault();
  };

  private readonly handleHostPointerDown = (event: PointerEvent) => {
    if (this.state.flightMode || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (
      target.closest('[data-workspace-tile="true"]')
      || target.closest('[data-scene-control="true"]')
      || target.closest('[data-workspace-ui="true"]')
    ) {
      return;
    }

    this.dragging = true;
    this.activePointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private readonly handleWindowPointerMove = (event: PointerEvent) => {
    if (this.shouldIgnorePointerTarget(event.target, event.buttons)) {
      this.pointerTarget.set(0, 0);
      this.pointerInfluenceActive = false;
    } else {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
        this.pointerInfluenceActive = true;
      }
    }

    if (!this.dragging || this.activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.pointerDragDistance += Math.abs(deltaX) + Math.abs(deltaY);
    this.cameraController.applyPointerDrag(deltaX, deltaY, this.state.flightMode);
  };

  private readonly handleWindowPointerUp = (event: PointerEvent) => {
    if (!this.dragging || (this.activePointerId !== null && event.pointerId !== this.activePointerId)) {
      return;
    }

    this.dragging = false;
    this.activePointerId = null;
    this.pointerDownShellId = null;
    this.pointerDragDistance = 0;
    this.canvas.style.cursor = this.state.flightMode ? 'grab' : '';
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.state.flightMode || !MOVEMENT_CODES.has(event.code) || this.isTextInputTarget(event.target)) {
      return;
    }
    this.cameraController.addMovementKey(event.code);
    event.preventDefault();
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.cameraController.removeMovementKey(event.code);
  };

  private readonly handleBlur = () => {
    this.dragging = false;
    this.activePointerId = null;
    this.pointerDownShellId = null;
    this.pointerDragDistance = 0;
    this.cameraController.clearMovementKeys();
    this.pointerInfluenceActive = false;
    this.pointerTarget.set(0, 0);
    this.canvas.style.cursor = this.state.flightMode ? 'grab' : '';
  };

  private animate = () => {
    if (!this.mounted) {
      return;
    }

    this.frameHandle = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.frameCount += 1;

    if (this.state.themeAuto && this.frameCount % 120 === 0) {
      const nextTimeTheme = getThemeByTime();
      if (nextTimeTheme !== this.lastResolvedTimeTheme) {
        this.lastResolvedTimeTheme = nextTimeTheme;
        this.triggerThemeTransition(WORKSPACE_SCENE_THEMES[nextTimeTheme]);
      }
    }

    this.pointer.lerp(this.pointerTarget, this.state.flightMode ? FLIGHT_POINTER_EASING : SURFACE_POINTER_EASING);
    this.flightTileBlend += ((this.state.flightMode ? 1 : 0) - this.flightTileBlend) * (1 - Math.exp(-5.4 * delta));

    this.updateTheme(delta, time);
    this.terrainController.updateTerrain(time);
    this.cameraController.update(delta, time, this.horizonMesh, this.mistMesh, this.themeTarget.id);
    this.updateAtmospherics(delta, time);
    this.updateFlightTileProjection(delta);

    this.composer.render();
  };

  private rebuildFlightTileAnchors(tiles: WorkspaceSceneTileDescriptor[]) {
    this.flightTileAnchors.clear();

    if (!tiles.length) {
      return;
    }

    const themeTuning = WORKSPACE_SCENE_FLIGHT_TILE_TUNING[this.themeTarget.id];
    const buckets = {
      far: tiles.filter((tile) => tile.distance3D === 'far'),
      mid: tiles.filter((tile) => tile.distance3D === 'mid'),
      near: tiles.filter((tile) => tile.distance3D === 'near'),
    };

    (Object.keys(buckets) as Array<keyof typeof buckets>).forEach((distance) => {
      const bucket = [...buckets[distance]].sort((left, right) => {
        if (left.normalizedX !== right.normalizedX) {
          return left.normalizedX - right.normalizedX;
        }
        return (left.isPinned === right.isPinned) ? left.id.localeCompare(right.id) : (left.isPinned ? -1 : 1);
      });

      const style = themeTuning[distance];
      const arcOffsets = this.buildFlightArcOffsets(bucket.length, style.wallArc);

      bucket.forEach((tile, index) => {
        const sourceLocalX = clamp(tile.normalizedX * TERRAIN_RADIUS * 0.42, -TERRAIN_RADIUS * 0.48, TERRAIN_RADIUS * 0.48);
        const sourceLocalY = clamp(18 + tile.normalizedY * TERRAIN_RADIUS * 0.18, -TERRAIN_RADIUS * 0.18, TERRAIN_RADIUS * 0.42);
        this.flightTileAnchors.set(tile.id, {
          descriptor: tile,
          wallAngleOffset: arcOffsets[index] ?? 0,
          wallHeight: style.wallHeight,
          sourceLocalX,
          sourceLocalY,
          sourceLift: style.sourceLift,
          bandScale: style.scale,
          bandOpacity: style.opacity,
          bandBlur: style.blur,
          bandOrder: distance === 'far' ? 1 : distance === 'mid' ? 2 : 3,
        });
      });
    });
  }

  private buildFlightArcOffsets(count: number, halfArc: number) {
    if (count <= 0) {
      return [];
    }
    if (count === 1) {
      return [0];
    }

    return Array.from({ length: count }, (_, index) => {
      const normalized = index / (count - 1);
      const centered = normalized * 2 - 1;
      const shaped = Math.sign(centered) * Math.pow(Math.abs(centered), 0.84);
      return shaped * halfArc;
    });
  }

  private captureFlightTileWallYaw() {
    const forwardYaw = this.getLocalCameraForwardYaw();
    this.flightTileWallTargetYaw = this.snapFlightTileWallYaw(forwardYaw);
    this.flightTileWallYaw = this.flightTileWallTargetYaw;
  }

  private updateFlightTileWallYaw(delta: number) {
    if (!this.state.flightMode) {
      return;
    }

    const tuning = WORKSPACE_SCENE_FLIGHT_TILE_TUNING[this.themeTarget.id];
    const forwardYaw = this.getLocalCameraForwardYaw();
    const snappedYaw = this.snapFlightTileWallYaw(forwardYaw);
    const targetDelta = Math.abs(this.shortestAngleDelta(snappedYaw, this.flightTileWallTargetYaw));
    const forwardDelta = Math.abs(this.shortestAngleDelta(forwardYaw, this.flightTileWallTargetYaw));

    if (targetDelta > 0.001 && forwardDelta >= tuning.wallSwitchThreshold) {
      this.flightTileWallTargetYaw = snappedYaw;
    }

    const blend = 1 - Math.exp(-tuning.wallSwitchBlendSpeed * delta);
    this.flightTileWallYaw = this.normalizeAngle(
      this.flightTileWallYaw + this.shortestAngleDelta(this.flightTileWallTargetYaw, this.flightTileWallYaw) * blend,
    );
  }

  private getLocalCameraForwardYaw() {
    this.localCameraPosition.copy(this.camera.position);
    this.localForwardPoint.copy(this.camera.position);
    this.camera.getWorldDirection(this.localForwardDirection);
    this.localForwardPoint.add(this.localForwardDirection);

    this.terrainGroup.worldToLocal(this.localCameraPosition);
    this.terrainGroup.worldToLocal(this.localForwardPoint);
    this.localForwardDirection.copy(this.localForwardPoint).sub(this.localCameraPosition);

    if (this.localForwardDirection.lengthSq() < 0.0001) {
      return this.flightTileWallYaw;
    }

    return Math.atan2(this.localForwardDirection.x, this.localForwardDirection.y);
  }

  private snapFlightTileWallYaw(yaw: number) {
    const walls = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];
    let closest = walls[0];
    let closestDelta = Infinity;

    for (const wallYaw of walls) {
      const delta = Math.abs(this.shortestAngleDelta(yaw, wallYaw));
      if (delta < closestDelta) {
        closestDelta = delta;
        closest = wallYaw;
      }
    }

    return closest;
  }

  private normalizeAngle(angle: number) {
    let normalized = angle;
    while (normalized <= -Math.PI) normalized += Math.PI * 2;
    while (normalized > Math.PI) normalized -= Math.PI * 2;
    return normalized;
  }

  private shortestAngleDelta(target: number, source: number) {
    return this.normalizeAngle(target - source);
  }

  private updateFlightTileProjection(delta: number) {
    if (!this.onFlightTileProjection) {
      return;
    }

    if (!this.state.flightMode || !this.flightTileAnchors.size) {
      this.onFlightTileProjection([]);
      return;
    }

    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width <= 0 || height <= 0) {
      this.onFlightTileProjection([]);
      return;
    }

    const tuning = WORKSPACE_SCENE_FLIGHT_TILE_TUNING[this.themeTarget.id];
    this.updateFlightTileWallYaw(delta);
    this.projectedFlightTiles.length = 0;
    const wallRadius = TERRAIN_RADIUS * tuning.wallRadius;
    this.flightTileAnchors.forEach((anchor) => {
      this.terrainController.sampleTerrainPoint(
        anchor.sourceLocalX,
        anchor.sourceLocalY,
        this.flightTileSourcePoint,
        this.flightTileSourceNormal,
      );
      this.flightTileSourcePoint.addScaledVector(WORLD_UP, anchor.sourceLift);

      const wallYaw = this.flightTileWallYaw + anchor.wallAngleOffset;
      this.flightTileTargetPoint.set(
        Math.sin(wallYaw) * wallRadius,
        Math.cos(wallYaw) * wallRadius,
        anchor.wallHeight,
      );
      this.terrainGroup.localToWorld(this.flightTileTargetPoint);

      this.flightTileProjectedPoint.copy(this.flightTileSourcePoint).lerp(this.flightTileTargetPoint, this.flightTileBlend);
      this.flightTileClipPoint.copy(this.flightTileProjectedPoint).project(this.camera);

      const left = (this.flightTileClipPoint.x * 0.5 + 0.5) * width;
      const top = (-this.flightTileClipPoint.y * 0.5 + 0.5) * height;
      const inFront = this.flightTileClipPoint.z > -1 && this.flightTileClipPoint.z < 1;
      const withinMargin = left > -320 && left < width + 320 && top > -220 && top < height + 220;
      const visible = inFront && withinMargin;
      const distance = this.camera.position.distanceTo(this.flightTileProjectedPoint);
      const focusBoost = anchor.descriptor.isFocused ? 0.06 : 0;
      const distanceScale = clamp(92 / distance, 0.58, 1.12);
      const edgeFadeX = clamp(1 - Math.max(0, Math.abs(this.flightTileClipPoint.x) - 0.74) * 1.9, 0, 1);
      const edgeFadeY = clamp(1 - Math.max(0, Math.abs(this.flightTileClipPoint.y) - 0.68) * 2.3, 0, 1);
      const opacity = visible
        ? clamp(anchor.bandOpacity * edgeFadeX * edgeFadeY - (1 - edgeFadeX * edgeFadeY) * tuning.edgeOpacityDecay + focusBoost, 0, 1)
        : 0;
      const blur = anchor.bandBlur + (1 - edgeFadeX * edgeFadeY) * tuning.edgeBlurGain + (visible ? 0 : 0.8);
      const zIndex = anchor.bandOrder * 100 + Math.round(clamp(320 - distance, 0, 180));

      this.projectedFlightTiles.push({
        id: anchor.descriptor.id,
        left,
        top,
        scale: anchor.bandScale * distanceScale + focusBoost + (anchor.descriptor.isPinned ? tuning.pinnedScaleBoost : 0),
        opacity,
        blur,
        zIndex,
        visible,
      });
    });

    this.onFlightTileProjection(this.projectedFlightTiles);
  }

  private triggerThemeTransition(nextTheme: typeof WORKSPACE_SCENE_THEMES[WorkspaceSceneTheme]) {
    if (nextTheme === this.themeTarget) return;
    if (!this.hasFirstStateApplied) {
      // First-ever setState: snap immediately, no cinematic intro
      this.themeTarget = nextTheme;
      this.backgroundStyle.skyTop = nextTheme.skyTop;
      this.backgroundStyle.skyBottom = nextTheme.skyBottom;
      return;
    }
    this.transitionFromTheme = this.themeTarget;
    this.themeTarget = nextTheme;
    this.transitionT = 0;
    this.transitionActive = true;
    this.backgroundStyle.skyTop = nextTheme.skyTop;
    this.backgroundStyle.skyBottom = nextTheme.skyBottom;
  }

  private updateTheme(delta: number, time: number) {
    const theme = this.themeTarget;
    const { denseFogTheme, mistyTheme, overcastIntensity } = resolveThemeAtmosphere(theme.id);
    const lerpSpeed = Math.min(0.1, delta * 0.9);

    // ── Cinematic transition ────────────────────────────────────────────────
    if (this.transitionActive) {
      this.transitionT = Math.min(1, this.transitionT + delta / this.transitionDuration);
      if (this.transitionT >= 1) this.transitionActive = false;
    }
    const sinT = Math.sin(this.transitionT * Math.PI); // bell: 0 → peak at t=0.5 → 0
    const isT = this.transitionActive;

    // Sky: commits first — the light changes before you realise it
    const skyLerpSpeed     = lerpSpeed * (isT ? 1.0 + sinT * 3.2 + (1 - this.transitionT) * 1.4 : 1.0);
    // Lights: fast like sky — new shadows fall before the terrain transforms
    const lightLerpSpeed   = lerpSpeed * (isT ? 1.2 + sinT * 3.8 : 1.0);
    // Fog: delayed and sweeps through like an atmospheric front
    const fogLerpSpeed     = lerpSpeed * (isT ? 0.3 + sinT * 2.8 : 1.0);
    // Terrain colours: arrive last — the ground catches up to the sky it's under
    const terrainLerpSpeed = lerpSpeed * (isT ? Math.max(0.08, this.transitionT * this.transitionT * 2.8) : 1.0);
    // Exposure: brief dip at midpoint — the old sun sets before the new one rises
    const exposureFlash    = isT ? sinT * -0.18 : 0;
    // Bloom: corona flare at midpoint — the world repaints itself in light
    const bloomSpike       = isT ? sinT * 0.45 : 0;
    // Fog density: swell at midpoint — a wave of atmosphere rolls through
    const fogDensityBoost  = isT ? sinT * 0.0055 : 0;
    // Terrain amplitude: the ground shudders as the new world arrives
    const terrainPulse     = isT ? 1.0 + sinT * 0.28 : 1.0;
    // ───────────────────────────────────────────────────────────────────────

    if (denseFogTheme && this.lightningProgress <= 0 && time >= this.nextLightningAt) {
      this.lightningProgress = 0.55;
      this.nextLightningAt = time + 26 + Math.random() * 8;
    }

    if (this.lightningProgress > 0) {
      this.lightningProgress = Math.max(0, this.lightningProgress - delta);
    }

    const lightningFlash = computeLightningFlash(this.lightningProgress, denseFogTheme);

    const skyMaterial = this.skyDome.material as THREE.ShaderMaterial;
    const hazeMaterial = this.horizonMesh.material as THREE.ShaderMaterial;
    const mistMaterial = this.mistMesh.material as THREE.ShaderMaterial;
    const terrainFogMaterial = this.terrainFogLayer.material as THREE.ShaderMaterial;
    const boundaryFogMaterial = this.boundaryFog.material as THREE.ShaderMaterial;
    const rainMaterial = this.rain.material as THREE.LineBasicMaterial;
    const surfaceMaterial = this.surface.material as THREE.MeshStandardMaterial;
    const wireMaterial = this.wireframe.material as THREE.MeshBasicMaterial;
    const glowWireMaterial = this.glowWireframe.material as THREE.MeshBasicMaterial;
    const pointsMaterial = this.surfacePoints.material as THREE.PointsMaterial;
    const particleMaterial = this.ambientParticles.material as THREE.PointsMaterial;
    const sceneFog = this.scene.fog as THREE.FogExp2;
    const peakBeaconMaterial = this.peakBeacons.material as THREE.ShaderMaterial;
    const visual = WORKSPACE_SCENE_VISUAL_TUNING[theme.id];
    const terrainVisual = this.terrainController.getVisualState(time);
    const terrainVisibility = terrainVisual.visibility;
    const terrainOpacity = Math.pow(terrainVisibility, 1.15);
    const terrainCollapse = terrainVisual.collapseProgress;
    const terrainStillness = 1 - terrainVisual.motionFactor;
    const voidAura = terrainVisual.collapsePulse * 0.16 + terrainCollapse * (1 - terrainVisibility) * 0.18;
    this.terrainController.setPeakBeaconsEnabled(visual.beaconOpacity > 0.001 && terrainVisibility > 0.05);

    const terrainViewHeight = this.terrainController.getCameraLocalHeight();
    const flightSurveyFactor = THREE.MathUtils.smoothstep(terrainViewHeight, 10, 36);
    const wireOpacityTarget = this.state.flightMode
      ? THREE.MathUtils.lerp(visual.wireFlightOpacityNear, visual.wireFlightOpacityFar, flightSurveyFactor)
      : visual.wireSurfaceOpacity;
    const glowOpacityBase = this.state.flightMode
      ? THREE.MathUtils.lerp(visual.glowFlightOpacityNear, visual.glowFlightOpacityFar, flightSurveyFactor)
      : visual.glowSurfaceOpacity;

    // ── Sky: Stage 1 — first to change ─────────────────────────────────────
    skyMaterial.uniforms.time.value = time;
    (skyMaterial.uniforms.topColor.value as THREE.Color).lerp(_scratchColor.set(theme.skyTop), skyLerpSpeed);
    (skyMaterial.uniforms.bottomColor.value as THREE.Color).lerp(_scratchColor.set(theme.skyBottom), skyLerpSpeed);
    (skyMaterial.uniforms.horizonColor.value as THREE.Color).lerp(_scratchColor.set(theme.horizon), skyLerpSpeed);

    // ── Atmosphere: Stage 2 — fog front rolls in ───────────────────────────
    sceneFog.color.lerp(_scratchColor.set(theme.fog), fogLerpSpeed);
    sceneFog.density += (theme.fogDensity + fogDensityBoost + terrainCollapse * 0.0016 - sceneFog.density) * fogLerpSpeed;
    this.renderer.toneMappingExposure += (
      (theme.exposure + lightningFlash * 0.44 + exposureFlash - terrainCollapse * 0.03) - this.renderer.toneMappingExposure
    ) * lerpSpeed;

    // ── Terrain colours: Stage 3 — the ground arrives last ─────────────────
    lerpColor(this.terrainFillColor, theme.terrainFill, terrainLerpSpeed);
    lerpColor(this.terrainWireColor, theme.terrainWire, terrainLerpSpeed);
    lerpColor(this.terrainPointColor, theme.terrainPoints, terrainLerpSpeed);
    lerpColor(this.particleColor, theme.particles, lerpSpeed);
    lerpColor(this.bodyColor, theme.shellFrame, delta * 1.9);
    lerpColor(this.bodyEmissiveColor, theme.shellGlow, delta * 1.6);

    this.shells.forEach((shell) => {
      const glowUniforms = (shell.glowMaterial as unknown as THREE.ShaderMaterial).uniforms;
      if (glowUniforms) {
        (glowUniforms.uColor.value as THREE.Color).lerp(_scratchColor.set(theme.shellGlow), delta * 1.6);
      }
    });

    this.sharedColorB.copy(this.terrainFillColor).lerp(
      _scratchColor.set(theme.fog),
      denseFogTheme ? 0.14 : theme.id === 'night' ? 0.07 : 0.1,
    );
    surfaceMaterial.color.copy(this.sharedColorB);
    surfaceMaterial.emissive.lerp(_scratchColor.set(theme.terrainEmissive), terrainLerpSpeed);
    surfaceMaterial.emissiveIntensity += (Math.min(theme.emissiveIntensity, visual.emissiveCap) - surfaceMaterial.emissiveIntensity) * terrainLerpSpeed;
    surfaceMaterial.roughness += (theme.meshRoughness - surfaceMaterial.roughness) * terrainLerpSpeed;
    surfaceMaterial.metalness += (theme.meshMetalness - surfaceMaterial.metalness) * terrainLerpSpeed;
    surfaceMaterial.opacity += ((0.96 * terrainOpacity) - surfaceMaterial.opacity) * (terrainLerpSpeed * 1.6);

    // ── Wireframe base layer — subtle hue shift синхронно с волнами ──────────
    // Три якорных цвета переливания: wire, glow, horizon — плавно гуляют между ними
    this.wireShiftColorA.set(theme.terrainWire);
    this.wireShiftColorB.set(theme.terrainGlow);
    this.wireShiftColorC.set(theme.horizon);

    // Синхронная пульсация: две медленные синусоиды с разными фазами
    const shiftPhaseA = (Math.sin(time * 0.18) * 0.5 + 0.5);            // 0..1 медленно
    const shiftPhaseB = (Math.sin(time * 0.11 + 1.9) * 0.5 + 0.5);     // 0..1 другая фаза
    const shiftPhaseC = (Math.cos(time * 0.07 + 3.4) * 0.5 + 0.5);     // 0..1 третья фаза

    // Базовая wire — mix между wire и glow
    this.sharedColorA.copy(this.wireShiftColorA)
      .lerp(this.wireShiftColorB, shiftPhaseA * 0.38)
      .lerp(this.wireShiftColorC, shiftPhaseB * 0.14);
    this.sharedColorA.lerp(this.terrainFillColor, 1 - visual.wireBlend);
    wireMaterial.color.lerp(this.sharedColorA, terrainLerpSpeed * 2.2);
    wireMaterial.opacity += (
      ((Math.min(theme.wireOpacity, wireOpacityTarget) * terrainOpacity) + voidAura * 0.26 - wireMaterial.opacity)
    ) * terrainLerpSpeed;

    // ── Glow wireframe — более яркое переливание (AdditiveBlending усиливает) ─
    this.neonEdgeThemeColor.set(theme.horizon);
    // Базовый целевой цвет glow
    this.neonEdgeTargetColor.set(theme.terrainGlow).lerp(this.neonEdgeThemeColor, 0.18);
    // Добавляем цветовой сдвиг: glow → horizon → wire в разных фазах
    this.neonEdgeTargetColor
      .lerp(this.wireShiftColorC, shiftPhaseA * 0.55)   // к horizon
      .lerp(this.wireShiftColorA, shiftPhaseC * 0.22);  // к wire
    this.terrainGlowColor.lerp(this.neonEdgeTargetColor, terrainLerpSpeed * 1.8);
    glowWireMaterial.color.copy(this.terrainGlowColor);

    // Дыхание яркости синхронно с переливом — немного сильнее когда цвет ближе к horizon
    const edgeBreath = 0.92 + Math.sin(time * 0.42) * 0.05 + Math.cos(time * 0.21 + 0.8) * 0.025 + shiftPhaseB * 0.03;
    glowWireMaterial.opacity += (
      (((glowOpacityBase * edgeBreath) * terrainOpacity) + voidAura * 0.3 - glowWireMaterial.opacity)
    ) * (terrainLerpSpeed * 1.5);

    this.sharedColorB.copy(this.terrainFillColor).lerp(this.terrainPointColor, 0.46);
    pointsMaterial.color.copy(this.sharedColorB);
    pointsMaterial.opacity += (
      ((Math.min(theme.pointsOpacity, visual.pointOpacity) * (this.state.flightMode ? 0.9 : 1) * terrainOpacity) - pointsMaterial.opacity)
    ) * terrainLerpSpeed;
    peakBeaconMaterial.uniforms.uTime.value = time;
    this.peakBeaconColor.copy(_scratchColor.set(theme.fog)).lerp(this.sharedColorA.set(theme.terrainBeacon), 0.82);
    (peakBeaconMaterial.uniforms.uColor.value as THREE.Color).lerp(this.peakBeaconColor, terrainLerpSpeed * 1.2);
    peakBeaconMaterial.uniforms.uOpacity.value += (
      ((visual.beaconOpacity * terrainOpacity) - peakBeaconMaterial.uniforms.uOpacity.value)
    ) * (terrainLerpSpeed * 1.4);

    particleMaterial.color.copy(this.particleColor);
    rainMaterial.color.lerp(_scratchColor.set(theme.horizon), fogLerpSpeed * 0.7);
    rainMaterial.opacity += ((denseFogTheme ? 0.18 : 0) - rainMaterial.opacity) * (fogLerpSpeed * 1.85);

    hazeMaterial.uniforms.time.value = time;
    (hazeMaterial.uniforms.baseColor.value as THREE.Color).lerp(_scratchColor.set(theme.fog), fogLerpSpeed);
    (hazeMaterial.uniforms.glowColor.value as THREE.Color).lerp(_scratchColor.set(theme.horizon), fogLerpSpeed);
    hazeMaterial.uniforms.storminess.value += (overcastIntensity - hazeMaterial.uniforms.storminess.value) * (fogLerpSpeed * 1.5);
    hazeMaterial.uniforms.opacity.value += (
      (
        THREE.MathUtils.clamp(
          visual.hazeOpacity + (this.state.flightMode ? 0.014 : 0) + terrainCollapse * 0.02,
          0,
          0.26,
        ) - hazeMaterial.uniforms.opacity.value
      )
    ) * fogLerpSpeed;

    mistMaterial.uniforms.time.value = time;
    (mistMaterial.uniforms.baseColor.value as THREE.Color).lerp(_scratchColor.set(theme.fog), fogLerpSpeed);
    (mistMaterial.uniforms.highlightColor.value as THREE.Color).lerp(_scratchColor.set(theme.horizon), fogLerpSpeed);
    mistMaterial.uniforms.storminess.value += (overcastIntensity - mistMaterial.uniforms.storminess.value) * (fogLerpSpeed * 1.5);
    mistMaterial.uniforms.opacity.value += (
      (
        THREE.MathUtils.clamp(
          visual.mistOpacity + (this.state.flightMode ? 0.01 : 0) + terrainCollapse * 0.028,
          0,
          0.26,
        ) - mistMaterial.uniforms.opacity.value
      )
    ) * fogLerpSpeed;

    terrainFogMaterial.uniforms.time.value = time;
    (terrainFogMaterial.uniforms.baseColor.value as THREE.Color).lerp(_scratchColor.set(theme.fog), fogLerpSpeed);
    (terrainFogMaterial.uniforms.highlightColor.value as THREE.Color).lerp(_scratchColor.set(theme.horizon), fogLerpSpeed);
    terrainFogMaterial.uniforms.storminess.value += (overcastIntensity - terrainFogMaterial.uniforms.storminess.value) * (fogLerpSpeed * 1.5);
    terrainFogMaterial.uniforms.opacity.value += (
      (
        THREE.MathUtils.clamp(
          visual.terrainFogOpacity + (this.state.flightMode ? 0.012 : 0) + terrainCollapse * 0.08 + terrainStillness * 0.012,
          0,
          0.36,
        ) - terrainFogMaterial.uniforms.opacity.value
      )
    ) * fogLerpSpeed;

    (boundaryFogMaterial.uniforms.baseColor.value as THREE.Color).lerp(_scratchColor.set(theme.fog), fogLerpSpeed);
    (boundaryFogMaterial.uniforms.glowColor.value as THREE.Color).lerp(_scratchColor.set(theme.horizon), fogLerpSpeed);
    boundaryFogMaterial.uniforms.opacity.value += (0 - boundaryFogMaterial.uniforms.opacity.value) * fogLerpSpeed;

    // ── Lights: Stage 1 alongside sky — new light casts first ─────────────
    this.ambientLight.color.lerp(_scratchColor.set(theme.ambientLight), lightLerpSpeed);
    this.mainLight.color.lerp(_scratchColor.set(theme.mainLight), lightLerpSpeed);
    this.accentLight.color.lerp(_scratchColor.set(theme.accentLight), lightLerpSpeed);
    this.hemiLight.color.lerp(_scratchColor.set(theme.mainLight), lightLerpSpeed);
    this.hemiLight.groundColor.lerp(_scratchColor.set(theme.fog), lightLerpSpeed);
    this.ambientLight.intensity = 0.72 + lightningFlash * 1.2;
    this.hemiLight.intensity = 0.38 + lightningFlash * 0.5;
    this.mainLight.intensity = 0.78 + lightningFlash * 2.9;
    this.accentLight.intensity = 0.2 + lightningFlash * 0.95;

    this.bodyMaterial.color.copy(this.bodyColor);
    this.bodyMaterial.emissive.copy(this.bodyEmissiveColor);
    this.bodyMaterial.emissiveIntensity += (
      (this.state.flightMode ? 0.14 : 0.08) - this.bodyMaterial.emissiveIntensity
    ) * (delta * 2.4);
    this.bodyMaterial.opacity += ((this.state.flightMode ? 0.9 : 0.58) - this.bodyMaterial.opacity) * (delta * 2.4);

    // Bloom: corona flare spikes at midpoint, capped to prevent white-out
    this.bloomPass.strength += (
      Math.min(theme.bloomStrength + bloomSpike + voidAura * 0.9, 1.2) - this.bloomPass.strength
    ) * lerpSpeed;
    const nextLightningOpacity = denseFogTheme ? String(Math.min(0.82, lightningFlash * 0.44)) : '0';
    if (this.lightningOverlay.style.opacity !== nextLightningOpacity) {
      this.lightningOverlay.style.opacity = nextLightningOpacity;
    }
    this.horizonMesh.visible = !denseFogTheme && hazeMaterial.uniforms.opacity.value > 0.004;
    this.mistMesh.visible = !denseFogTheme && mistMaterial.uniforms.opacity.value > 0.004;
    this.terrainFogLayer.visible = terrainFogMaterial.uniforms.opacity.value > 0.01;
    this.boundaryFog.visible = false;
    this.peakBeacons.visible = terrainVisibility > 0.05 && peakBeaconMaterial.uniforms.uOpacity.value > 0.008;

    // Pass terrain pulse to controller so waves shudder during the transition
    this.terrainController.setAmplitudePulse(terrainPulse);
  }

  private updateAtmospherics(delta: number, time: number) {
    const terrainVisual = this.terrainController.getVisualState(time);
    // Update particles every 2nd frame — they are small and far, temporal aliasing is not visible
    if (this.frameCount % 2 === 0) {
      const pointerWorldPoint = this.terrainController.getPointerWorldPoint(this.pointerWorldPosition)
        ? this.pointerWorldPosition
        : null;

      const particlePositions = (this.ambientParticles.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const i3 = index * 3;

        if (pointerWorldPoint) {
          const dx = particlePositions[i3] - pointerWorldPoint.x;
          const dy = particlePositions[i3 + 1] - pointerWorldPoint.y;
          const dz = particlePositions[i3 + 2] - pointerWorldPoint.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > 0.001 && distSq < 400) {
            const dist = Math.sqrt(distSq);
            this.particleVelocities[index].x += (dx / dist) * 0.06;
            this.particleVelocities[index].y += (dy / dist) * 0.06;
            this.particleVelocities[index].z += (dz / dist) * 0.06;
          }
        }

        this.particleVelocities[index].lerp(this.particleBaseVelocities[index], 0.04);
        particlePositions[i3] += this.particleVelocities[index].x;
        particlePositions[i3 + 1] += this.particleVelocities[index].y;
        particlePositions[i3 + 2] += this.particleVelocities[index].z;

        if (particlePositions[i3] < -120) particlePositions[i3] = 120;
        if (particlePositions[i3 + 1] > 60) particlePositions[i3 + 1] = -10;
        if (particlePositions[i3 + 2] > 70) particlePositions[i3 + 2] = -70;
      }
      (this.ambientParticles.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
    }

    const denseFogTheme = this.themeTarget.id === 'overcast';
    const rainMaterial = this.rain.material as THREE.LineBasicMaterial;
    const rainVisible = rainMaterial.opacity > 0.005 || denseFogTheme;

    // Skip entire rain computation when rain is invisible
    if (rainVisible) {
      const rainCenter = this.camera.position;
      const rainArray = this.rainGeometry.attributes.position.array as Float32Array;
      const rainGust = denseFogTheme ? (Math.sin(time * 0.62) * 1.5 + Math.cos(time * 0.31) * 0.9) : 0;
      const rainCrosswind = denseFogTheme ? Math.cos(time * 0.44) * 0.8 : 0;

      for (let index = 0; index < RAIN_COUNT; index += 1) {
        const i3 = index * 3;
        const lineIndex = index * 6;
        const flutter = Math.sin(time * (1.3 + this.rainSwing[index]) + this.rainPhase[index]) * this.rainSwing[index];
        const drizzlePulse = 0.82 + Math.sin(time * 0.55 + this.rainPhase[index] * 0.7) * 0.12;
        const lateralDrift = (-this.rainDrift[index] * 0.07) + rainGust * this.rainDepth[index] * 0.06 + flutter * 0.05;
        const forwardDrift = (this.rainDrift[index] * 0.34) + rainCrosswind * this.rainDepth[index] * 0.08;
        const fallSpeed = this.rainVelocity[index] * drizzlePulse;
        const segmentLength = this.rainLength[index] * (0.75 + this.rainDepth[index] * 0.35);

        this.rainDrops[i3] += lateralDrift * delta;
        this.rainDrops[i3 + 1] -= fallSpeed * delta;
        this.rainDrops[i3 + 2] += forwardDrift * delta;

        const outOfRange =
          this.rainDrops[i3 + 1] < rainCenter.y - 18
          || Math.abs(this.rainDrops[i3] - rainCenter.x) > 112
          || Math.abs(this.rainDrops[i3 + 2] - rainCenter.z) > 112;

        if (outOfRange) {
          this.rainDrops[i3] = rainCenter.x + (Math.random() - 0.5) * 170;
          this.rainDrops[i3 + 1] = rainCenter.y + 32 + Math.random() * 64;
          this.rainDrops[i3 + 2] = rainCenter.z + (Math.random() - 0.5) * 170;
        }

        rainArray[lineIndex] = this.rainDrops[i3];
        rainArray[lineIndex + 1] = this.rainDrops[i3 + 1];
        rainArray[lineIndex + 2] = this.rainDrops[i3 + 2];
        rainArray[lineIndex + 3] = this.rainDrops[i3] + lateralDrift * 0.08;
        rainArray[lineIndex + 4] = this.rainDrops[i3 + 1] + segmentLength;
        rainArray[lineIndex + 5] = this.rainDrops[i3 + 2] - forwardDrift * 0.06;
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    }

    this.terrainGroup.rotation.z = Math.sin(time * 0.03) * 0.0018 * terrainVisual.motionFactor;
    this.boundaryFog.rotation.z = time * (0.012 + terrainVisual.collapseProgress * 0.018);
    this.boundaryFog.position.z = 5.8 + Math.sin(time * 0.18) * (0.35 + terrainVisual.collapseProgress * 0.28);
    this.terrainFogLayer.position.z += (
      (
        (denseFogTheme ? 11.8 : 8.6)
        + Math.sin(time * 0.22) * (denseFogTheme ? 0.65 : 0.22 + terrainVisual.collapseProgress * 0.18)
        + terrainVisual.collapseProgress * 1.4
      ) - this.terrainFogLayer.position.z
    ) * 0.08;
    this.horizonMesh.rotation.z = Math.sin(time * 0.11) * 0.015;
    this.mistMesh.rotation.z = -time * 0.01;
  }

  private applyFlightMode(enabled: boolean) {
    this.canvas.style.cursor = enabled ? 'grab' : '';
    this.dragging = false;
    this.activePointerId = null;
    this.pointerDownShellId = null;
    this.pointerDragDistance = 0;
    this.pointerInfluenceActive = false;
    this.pointerTarget.set(0, 0);

    // Swap terrain geometry LOD
    const nextGeometry = enabled ? this.flightTerrainGeometry : this.surfaceTerrainGeometry;
    this.surface.geometry = nextGeometry;
    this.wireframe.geometry = nextGeometry;
    this.glowWireframe.geometry = nextGeometry;
    this.surfacePoints.geometry = nextGeometry;
    this.terrainController.swapGeometry(
      enabled ? this.flightPositions : this.surfacePositions,
      enabled ? this.flightBaseX : this.surfaceBaseX,
      enabled ? this.flightBaseY : this.surfaceBaseY,
      enabled ? this.flightInitialZ : this.surfaceInitialZ,
    );

    this.cameraController.applyFlightMode(enabled);
    this.flightTileBlend = enabled ? 0 : 0;
    if (enabled) {
      this.captureFlightTileWallYaw();
    } else {
      this.onFlightTileProjection?.([]);
    }
    if (!enabled) {
      this.shellController.clearHover();
    }
  }

  private shouldIgnorePointerTarget(target: EventTarget | null, buttons: number) {
    if (!(target instanceof HTMLElement)) {
      return true;
    }

    if (!target.closest('[data-workspace-viewport="true"]')) {
      return true;
    }

    if (
      target.closest('[data-workspace-tile="true"]')
      || target.closest('[data-scene-control="true"]')
      || target.closest('[data-workspace-ui="true"]')
    ) {
      return true;
    }

    return !this.state.flightMode && buttons !== 0;
  }
  private isTextInputTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
      && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
        || Boolean(target.closest('[contenteditable=\"true\"]'))
      );
  }

  private timeFromIso(value: string) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return 999;
    }
    return (Date.now() - timestamp) / 1000;
  }
}
