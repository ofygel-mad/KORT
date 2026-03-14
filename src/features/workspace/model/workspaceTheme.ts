import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceBg =
  | 'grid'
  | 'bg01'
  | 'bg02'
  | 'bg03'
  | 'bg04'
  | 'bg05'
  | 'bg06'
  | 'bg07';

export interface WorkspaceBgDefinition {
  id: WorkspaceBg;
  label: string;
  description: string;
  isVideo: boolean;
  filename?: string;  // relative to /workspace-bgs/
}

export const WORKSPACE_BG_OPTIONS: WorkspaceBgDefinition[] = [
  { id: 'grid',  label: 'Сетка',          description: 'Дефолтный точечный фон',        isVideo: false },
  { id: 'bg01',  label: 'Абстракция',     description: 'Плавные цветовые волны',         isVideo: true, filename: 'bg01.mp4' },
  { id: 'bg02',  label: 'Туман',          description: 'Атмосферный медленный дрейф',    isVideo: true, filename: 'bg02.mp4' },
  { id: 'bg03',  label: 'Космос',         description: 'Тихое звёздное движение',        isVideo: true, filename: 'bg03.mp4' },
  { id: 'bg04',  label: 'Геометрия',      description: 'Анимированные формы',            isVideo: true, filename: 'bg04.mp4' },
  { id: 'bg05',  label: 'Огонь',          description: 'Тлеющие угли и свет',           isVideo: true, filename: 'bg05.mp4' },
  { id: 'bg06',  label: 'Матрица',        description: 'Цифровой поток данных',          isVideo: true, filename: 'bg06.mp4' },
  { id: 'bg07',  label: 'Океан',          description: 'Медитативные волны',             isVideo: true, filename: 'bg07.mp4' },
];

interface WorkspaceThemeStore {
  activeBg: WorkspaceBg;
  setActiveBg: (bg: WorkspaceBg) => void;
}

export const useWorkspaceTheme = create<WorkspaceThemeStore>()(
  persist(
    (set) => ({
      activeBg: 'grid',
      setActiveBg: (bg) => set({ activeBg: bg }),
    }),
    { name: 'kort-workspace-theme' },
  ),
);
