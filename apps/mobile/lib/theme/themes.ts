export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // UI
  border: string;
  borderLight: string;
  divider: string;
  overlay: string;

  // Interactive
  buttonPrimary: string;
  buttonSecondary: string;
  inputBackground: string;
  inputBorder: string;

  // Tab bar
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export type ThemeName = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'midnight';

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#EBEBEB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0055B3',
  secondary: '#5856D6',
  accent: '#FF9500',

  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#E0E0E0',
  overlay: 'rgba(0, 0, 0, 0.5)',

  buttonPrimary: '#007AFF',
  buttonSecondary: '#F0F0F0',
  inputBackground: '#F5F5F5',
  inputBorder: '#E0E0E0',

  tabBarBackground: '#FFFFFF',
  tabBarActive: '#007AFF',
  tabBarInactive: '#999999',
};

const darkColors: ThemeColors = {
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',

  text: '#FFFFFF',
  textSecondary: '#ABABAB',
  textTertiary: '#666666',
  textInverse: '#000000',

  primary: '#0A84FF',
  primaryLight: '#409CFF',
  primaryDark: '#0066CC',
  secondary: '#5E5CE6',
  accent: '#FF9F0A',

  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',

  border: '#38383A',
  borderLight: '#2C2C2E',
  divider: '#38383A',
  overlay: 'rgba(0, 0, 0, 0.7)',

  buttonPrimary: '#0A84FF',
  buttonSecondary: '#2C2C2E',
  inputBackground: '#1C1C1E',
  inputBorder: '#38383A',

  tabBarBackground: '#1C1C1E',
  tabBarActive: '#0A84FF',
  tabBarInactive: '#666666',
};

const oceanColors: ThemeColors = {
  ...darkColors,
  background: '#0D1B2A',
  backgroundSecondary: '#1B263B',
  backgroundTertiary: '#274060',
  surface: '#1B263B',
  surfaceElevated: '#274060',
  primary: '#00B4D8',
  primaryLight: '#48CAE4',
  primaryDark: '#0077B6',
  accent: '#90E0EF',
  tabBarBackground: '#1B263B',
  tabBarActive: '#00B4D8',
};

const forestColors: ThemeColors = {
  ...darkColors,
  background: '#1A2F1A',
  backgroundSecondary: '#2D4A2D',
  backgroundTertiary: '#3D6B3D',
  surface: '#2D4A2D',
  surfaceElevated: '#3D6B3D',
  primary: '#4ADE80',
  primaryLight: '#86EFAC',
  primaryDark: '#22C55E',
  accent: '#A3E635',
  tabBarBackground: '#2D4A2D',
  tabBarActive: '#4ADE80',
};

const sunsetColors: ThemeColors = {
  ...darkColors,
  background: '#1F1A24',
  backgroundSecondary: '#2D2533',
  backgroundTertiary: '#3D3344',
  surface: '#2D2533',
  surfaceElevated: '#3D3344',
  primary: '#F472B6',
  primaryLight: '#F9A8D4',
  primaryDark: '#EC4899',
  accent: '#FB923C',
  tabBarBackground: '#2D2533',
  tabBarActive: '#F472B6',
};

const midnightColors: ThemeColors = {
  ...darkColors,
  background: '#0F0F1A',
  backgroundSecondary: '#1A1A2E',
  backgroundTertiary: '#25254A',
  surface: '#1A1A2E',
  surfaceElevated: '#25254A',
  primary: '#818CF8',
  primaryLight: '#A5B4FC',
  primaryDark: '#6366F1',
  accent: '#C084FC',
  tabBarBackground: '#1A1A2E',
  tabBarActive: '#818CF8',
};

export const themes: Record<ThemeName, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
  ocean: oceanColors,
  forest: forestColors,
  sunset: sunsetColors,
  midnight: midnightColors,
};

export const getTheme = (name: ThemeName): ThemeColors => themes[name];

export const isDarkTheme = (name: ThemeName): boolean => name !== 'light';
