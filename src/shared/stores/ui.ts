import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ThemePack = 'neutral' | 'graphite' | 'sand' | 'obsidian' | 'enterprise';

interface UIStore {
  theme: Theme;
  themePack: ThemePack;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  adminMode: boolean;
  setTheme: (t: Theme) => void;
  setThemePack: (pack: ThemePack) => void;
  setAdminMode: (value: boolean) => void;
  toggleAdminMode: () => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
}

function resolveThemeMode(theme: Theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme, pack: ThemePack = 'neutral') {
  const root = document.documentElement;
  const mode = resolveThemeMode(theme);
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-theme-mode', theme);
  root.setAttribute('data-theme-pack', pack);
  root.style.colorScheme = mode;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      themePack: 'neutral',
      sidebarCollapsed: false,
      focusMode: false,
      adminMode: false,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme, get().themePack);
      },
      setThemePack: (themePack) => {
        set({ themePack });
        applyTheme(get().theme, themePack);
      },
      setAdminMode: (adminMode) => set({ adminMode }),
      toggleAdminMode: () => set((s) => ({ adminMode: !s.adminMode })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    { name: 'kort-ui' },
  ),
);

if (typeof window !== 'undefined') {
  const raw = localStorage.getItem('kort-ui');
  const parsed = raw ? JSON.parse(raw).state ?? {} : {};
  const theme: Theme = parsed.theme ?? 'system';
  const themePack: ThemePack = parsed.themePack ?? 'neutral';
  applyTheme(theme, themePack);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useUIStore.getState();
    if (state.theme === 'system') applyTheme('system', state.themePack);
  });
}
