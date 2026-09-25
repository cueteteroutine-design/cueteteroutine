export const DISPLAY_THEMES = [
  { id: 'aurora-light', label: 'Aurora · Light', description: 'Flowing aurora gradients', sample: 'display-preview-aurora-light' },
  { id: 'aurora-dark', label: 'Aurora · Dark', description: 'Flowing aurora gradients', sample: 'display-preview-aurora-dark' },
  { id: 'ocean-light', label: 'Ocean · Light', description: 'Soft waves and rounded cards', sample: 'display-preview-ocean-light' },
  { id: 'ocean-dark', label: 'Ocean · Dark', description: 'Soft waves and rounded cards', sample: 'display-preview-ocean-dark' },
  { id: 'sunset-light', label: 'Sunset · Light', description: 'Warm gradients and soft glow', sample: 'display-preview-sunset-light' },
  { id: 'sunset-dark', label: 'Sunset · Dark', description: 'Warm gradients and soft glow', sample: 'display-preview-sunset-dark' },
  { id: 'orbit-light', label: 'Orbit · Light', description: 'Orbital dots and floating panels', sample: 'display-preview-orbit-light' },
  { id: 'orbit-dark', label: 'Orbit · Dark', description: 'Orbital dots and floating panels', sample: 'display-preview-orbit-dark' },
  { id: 'blueprint-light', label: 'Blueprint · Light', description: 'Technical grid and crisp borders', sample: 'display-preview-blueprint-light' },
  { id: 'blueprint-dark', label: 'Blueprint · Dark', description: 'Technical grid and crisp borders', sample: 'display-preview-blueprint-dark' },
  { id: 'editorial-light', label: 'Editorial · Light', description: 'Serif headings and a moving accent', sample: 'display-preview-editorial-light' },
  { id: 'editorial-dark', label: 'Editorial · Dark', description: 'Serif headings and a moving accent', sample: 'display-preview-editorial-dark' },
] as const;
export type NewDisplayTheme = typeof DISPLAY_THEMES[number]['id'];
export const isDisplayTheme = (value: string) => ['classic', 'pulse', 'broadcast', ...DISPLAY_THEMES.map(t => t.id)].includes(value);
export const displayMode = (value: string) => value.endsWith('-dark') || value === 'broadcast' ? 'dark' : 'light';
