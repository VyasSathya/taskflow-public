/**
 * Color utility functions for dark mode support
 */

/**
 * Adjusts a hex color for better contrast in dark mode
 * Lightens colors in dark mode, darkens in light mode
 */
export function adjustColorForTheme(hexColor: string, isDark: boolean): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Convert to HSL for easier manipulation
  const { h, s, l } = rgbToHsl(r, g, b);

  // Adjust lightness based on theme
  // In dark mode: lighten the color for better visibility
  // In light mode: keep original or slightly darken
  let newL = l;
  if (isDark) {
    // Lighten: ensure minimum lightness of 50%
    newL = Math.max(l, 0.5);
    // If already light, keep it light
    if (l > 0.7) {
      newL = Math.min(l + 0.1, 0.9);
    }
  } else {
    // In light mode: darken if too light
    if (l > 0.7) {
      newL = l * 0.7;
    }
  }

  // Convert back to RGB
  const { r: newR, g: newG, b: newB } = hslToRgb(h, s, newL);

  // Convert to hex
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}

/**
 * Get appropriate opacity for tag background based on theme
 */
export function getTagBackgroundOpacity(isDark: boolean): number {
  return isDark ? 0.2 : 0.08;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255,
  };
}
