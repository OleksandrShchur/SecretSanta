import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Mock react-snowfall since canvas is not supported in jsdom
vi.mock('react-snowfall', () => ({
  default: () => null,
  Snowfall: () => null,
}));

// Mock window.confirm and alert for jsdom
window.confirm = vi.fn().mockReturnValue(true);
window.alert = vi.fn();

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  configurable: true,
});

// Mock Telegram WebApp
window.Telegram = {
  WebApp: {
    initData: '',
    initDataUnsafe: {
      user: {
        id: 100000001,
        first_name: 'Олександр',
        last_name: 'Щур',
        username: 'alex_shchur',
      },
    },
    version: '6.0',
    platform: 'tdesktop',
    colorScheme: 'light',
    themeParams: {},
    isExpanded: true,
    viewportHeight: 800,
    viewportStableHeight: 800,
    headerColor: '#ffffff',
    backgroundColor: '#ffffff',
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    BackButton: {
      isVisible: false,
      onClick: vi.fn(),
      offClick: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    },
  },
};

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  vi.resetAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
});
