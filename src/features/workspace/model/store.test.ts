import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, clampTileToWorldBounds, clampViewportToBounds, sanitizeWorkspacePersistedState } from './store';

describe('sanitizeWorkspacePersistedState', () => {
  it('drops unsupported tiles and normalizes malformed persisted values', () => {
    const state = sanitizeWorkspacePersistedState({
      tiles: [
        {
          id: 'legacy-summary',
          kind: 'summary',
          title: 'Legacy Summary',
          x: 40,
          y: 20,
          width: 240,
          height: 155,
          modalSize: 'default',
          version: 1,
          createdAt: '2026-03-18T00:00:00.000Z',
        },
        {
          id: 'tasks-1',
          kind: 'tasks',
          title: '',
          x: Number.NaN,
          y: 35,
          width: 0,
          height: Number.POSITIVE_INFINITY,
          modalSize: 'huge',
          version: 0,
          createdAt: 'invalid-date',
          pinned: 'yes',
          zIndex: -5,
        },
      ],
      viewport: { x: 'bad', y: 15 },
      viewportReady: 'yes',
      zoom: 999,
      topZIndex: -10,
    });

    expect(state.tiles).toHaveLength(1);
    expect(state.tiles[0]).toMatchObject({
      id: 'tasks-1',
      kind: 'tasks',
      distance3D: 'mid',
      x: 20,
      y: 35,
      width: 260,
      height: 170,
      modalSize: 'default',
      version: 1,
      status: 'floating',
      rotation3D: { x: -0.03, y: 0, z: 0 },
      pinned: false,
      zIndex: 1,
    });
    expect(state.tiles[0].createdAt).toEqual(expect.any(String));
    expect(state.tiles[0].lastInteractionAt).toEqual(expect.any(String));
    expect(state.viewport).toEqual({ x: 0, y: 15 });
    expect(state.viewportReady).toBe(false);
    expect(state.zoom).toBe(ZOOM_MAX);
    expect(state.topZIndex).toBe(10);
  });

  it('returns safe defaults when persisted state is absent', () => {
    const state = sanitizeWorkspacePersistedState(undefined);

    expect(state).toEqual({
      tiles: [],
      viewport: { x: 0, y: 0 },
      viewportReady: false,
      zoom: 1,
      topZIndex: 10,
      sceneTheme: 'morning',
      sceneTerrainMode: 'full',
    });
  });

  it('clamps viewport and tile positions to the current workspace bounds', () => {
    const viewport = clampViewportToBounds({ x: -5000, y: 120 }, 800, 600);
    const tile = clampTileToWorldBounds({
      id: 'tile-1',
      kind: 'tasks',
      title: 'Tasks',
      x: 2600,
      y: 1900,
      width: 260,
      height: 170,
      modalSize: 'default',
      version: 1,
      createdAt: '2026-03-18T00:00:00.000Z',
      lastInteractionAt: '2026-03-18T00:00:00.000Z',
      status: 'floating',
      rotation3D: { x: -0.03, y: 0, z: 0 },
      distance3D: 'mid',
      pinned: false,
      zIndex: 10,
    }, 800, 600);

    expect(viewport).toEqual({ x: -1600, y: 0 });
    expect(tile.x).toBe(2140);
    expect(tile.y).toBe(1630);
  });
});
