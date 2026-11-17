import type { TelegramUser } from './types';

// Declare Telegram WebApp types on window
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: number;
          hash?: string;
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        enableClosingConfirmation: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

const MOCK_STORAGE_KEY = 'secret_santa_mock_tg_user';

export function isInsideTelegram(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

export function initTelegramApp(): void {
  if (typeof window === 'undefined') return;
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
    } catch (e) {
      console.warn('Failed to initialize Telegram WebApp SDK:', e);
    }
  }
}

export function getTelegramUser(): TelegramUser {
  if (typeof window === 'undefined') {
    return { id: 100000001, first_name: 'Гість' };
  }

  // 1. If running inside real Telegram
  const realUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (realUser && realUser.id) {
    return realUser;
  }

  // 2. If running in a regular browser (dev mode), use persisted mock user
  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  // Default mock user for browser preview
  const defaultMock: TelegramUser = {
    id: 100000001,
    first_name: 'Олександр',
    last_name: 'Щур',
    username: 'alex_shchur',
  };
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultMock));
  return defaultMock;
}

export function setMockTelegramUser(user: TelegramUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('tg_user_changed'));
}

export function getTelegramStartParam(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. From Telegram WebApp initData
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (startParam) {
    return startParam.startsWith('room_') ? startParam.replace('room_', '') : startParam;
  }

  // 2. From URL params (?startapp=... or ?room=...)
  const params = new URLSearchParams(window.location.search);
  const startapp = params.get('startapp');
  if (startapp) {
    return startapp.startsWith('room_') ? startapp.replace('room_', '') : startapp;
  }

  return params.get('room');
}

export function openTelegramShare(url: string, text: string): void {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const webApp = window.Telegram?.WebApp;
  if (webApp && typeof webApp.openTelegramLink === 'function') {
    webApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}

export function triggerHaptic(type: 'success' | 'warning' | 'error' | 'light'): void {
  const haptic = window.Telegram?.WebApp?.HapticFeedback;
  if (!haptic) return;

  try {
    if (type === 'light') {
      haptic.impactOccurred('light');
    } else {
      haptic.notificationOccurred(type);
    }
  } catch {
    // Haptics not supported on device
  }
}
