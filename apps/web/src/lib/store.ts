import { create } from 'zustand';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'SUPERVISOR' | 'ADMIN';
  wardId?: string | null;
  trustScore?: number;
}

export interface ComplaintDraft {
  title: string;
  description: string;
  categoryId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  landmark?: string;
  photosBase64: string[];
}

interface AppState {
  user: UserSession | null;
  locale: 'en' | 'hi';
  draft: ComplaintDraft | null;
  setUser: (user: UserSession | null) => void;
  setLocale: (locale: 'en' | 'hi') => void;
  saveDraft: (draft: ComplaintDraft) => void;
  clearDraft: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  locale: 'en',
  draft: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cc_draft') || 'null') : null,

  setUser: (user) => set({ user }),
  setLocale: (locale) => {
    if (typeof window !== 'undefined') localStorage.setItem('cc_locale', locale);
    set({ locale });
  },
  saveDraft: (draft) => {
    if (typeof window !== 'undefined') localStorage.setItem('cc_draft', JSON.stringify(draft));
    set({ draft });
  },
  clearDraft: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('cc_draft');
    set({ draft: null });
  },
}));
