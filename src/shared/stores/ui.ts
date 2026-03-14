import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCommandPalette } from './commandPalette';
import { getDocument, getWindow, readStorage } from '../lib/browser';

export type Theme = 'light' | 'dark' | 'system';
export type ThemePack = 'neutral' | 'graphite' | 'sand' | 'obsidian' | 'enterprise';

type ActionRequest<T = undefined> = {
  nonce: number;
  payload: T;
};

type CreateDealPayload = {
  customerId?: string;
  title?: string;
};

type CreateTaskPayload = {
  customerId?: string;
  title?: string;
};

interface UIStore {
  theme: Theme;
  themePack: ThemePack;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  adminMode: boolean;
  createCustomerRequest: ActionRequest<undefined>;
  createDealRequest: ActionRequest<CreateDealPayload | undefined>;
  createTaskRequest: ActionRequest<CreateTaskPayload | undefined>;
  assistantPromptRequest: ActionRequest<string | undefined>;
  setTheme: (t: Theme) => void;
  setThemePack: (pack: ThemePack) => void;
  setAdminMode: (value: boolean) => void;
  toggleAdminMode: () => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  openCreateCustomer: () => void;
  openCreateDeal: (payload?: CreateDealPayload) => void;
  openCreateTask: (payload?: CreateTaskPayload) => void;
  openAssistantPrompt: (prompt?: string) => void;
  openCommandPalette: () => void;
}

function resolveThemeMode(theme: Theme) {
  if (theme === 'system') {
    return getWindow()?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme, pack: ThemePack = 'neutral') {
  const root = getDocument()?.documentElement;
  if (!root) return;
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
      createCustomerRequest: { nonce: 0, payload: undefined },
      createDealRequest: { nonce: 0, payload: undefined },
      createTaskRequest: { nonce: 0, payload: undefined },
      assistantPromptRequest: { nonce: 0, payload: undefined },
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
      openCreateCustomer: () => set((s) => ({
        createCustomerRequest: { nonce: s.createCustomerRequest.nonce + 1, payload: undefined },
      })),
      openCreateDeal: (payload) => set((s) => ({
        createDealRequest: { nonce: s.createDealRequest.nonce + 1, payload },
      })),
      openCreateTask: (payload) => set((s) => ({
        createTaskRequest: { nonce: s.createTaskRequest.nonce + 1, payload },
      })),
      openAssistantPrompt: (prompt) => set((s) => ({
        assistantPromptRequest: { nonce: s.assistantPromptRequest.nonce + 1, payload: prompt },
      })),
      openCommandPalette: () => useCommandPalette.getState().open(),
    }),
    {
      name: 'kort-ui',
      partialize: (state) => ({
        theme: state.theme,
        themePack: state.themePack,
        sidebarCollapsed: state.sidebarCollapsed,
        focusModeActive: state.focusModeActive,
      }),
    },
  ),
);

const win = getWindow();
if (win) {
  const raw = readStorage('kort-ui');
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? JSON.parse(raw).state ?? {} : {};
  } catch {
    parsed = {};
  }
  const theme: Theme = (parsed.theme as Theme) ?? 'system';
  const themePack: ThemePack = (parsed.themePack as ThemePack) ?? 'neutral';
  applyTheme(theme, themePack);
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  const syncTheme = () => {
    const state = useUIStore.getState();
    if (state.theme === 'system') applyTheme('system', state.themePack);
  };
  if (typeof media.addEventListener === 'function') media.addEventListener('change', syncTheme);
  else media.addListener(syncTheme);
}
