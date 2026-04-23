// tokens.jsx — Linear v2 monochrome palette
// Brand accent is intentionally neutral (#111). Only ok / warn carry hue.
const THEMES = {
  light: {
    bg:          '#FAFAFA',
    surface:     '#FFFFFF',
    surfaceAlt:  '#F5F5F5',
    surface2:    '#F0F0F0',
    text:        '#111111',
    textSec:     '#6B6B6B',
    textTer:     '#9B9B9B',
    border:      '#EAEAEA',
    borderStrong:'#D4D4D4',
    accent:      '#111111',
    accentSoft:  '#F0F0F0',
    accentInk:   '#111111',
    success:     '#2A8D5C',
    warn:        '#C2410C',
    danger:      '#B42318',
    good:        '#2A8D5C',
    neutral:     '#9B9B9B',
    chipBg:      '#F0F0F0',
  },
  dark: {
    bg:          '#0B0B0B',
    surface:     '#141414',
    surfaceAlt:  '#1A1A1A',
    surface2:    '#1F1F1F',
    text:        '#FAFAFA',
    textSec:     '#A0A0A0',
    textTer:     '#6B6B6B',
    border:      '#242424',
    borderStrong:'#383838',
    accent:      '#FAFAFA',
    accentSoft:  '#1F1F1F',
    accentInk:   '#FAFAFA',
    success:     '#5FC48B',
    warn:        '#E8854A',
    danger:      '#E8654A',
    good:        '#5FC48B',
    neutral:     '#6B6B6B',
    chipBg:      '#1F1F1F',
  },
};

const FONT = {
  sans: '"Noto Sans JP", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

function useTheme(dark) {
  return dark ? THEMES.dark : THEMES.light;
}

Object.assign(window, { THEMES, FONT, useTheme });
