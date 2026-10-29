// The looks a student can pick in Settings. The colours live in styles.css under [data-theme="<id>"];
// this list only names them (and gives the browser's address bar colour).
export const THEMES = [
  { id: 'dark', name: 'Midnight Violet', note: 'Black with violet and amber', bar: '#000000' },
  { id: 'light', name: 'Daylight', note: 'Clean and bright', bar: '#f6f7fb' },
  { id: 'mint', name: 'Forest Mint', note: 'Deep green with mint', bar: '#07110e' },
  { id: 'paper', name: 'Notebook Paper', note: 'Ruled paper and ink blue', bar: '#f6f1e7' },
  { id: 'arcade', name: 'Neon Arcade', note: 'Bold cyan and pink', bar: '#0a0614' },
  { id: 'glass', name: 'Slate Glass', note: 'Soft indigo gradient', bar: '#0b1226' },
  { id: 'ocean', name: 'Deep Ocean', note: 'Navy fading to teal', bar: '#041a2a' },
  { id: 'sunset', name: 'Sunset', note: 'Plum fading to ember', bar: '#1a0b24' },
  { id: 'blossom', name: 'Blossom', note: 'Light and rosy', bar: '#fff1f4' },
  { id: 'stars', name: 'Starfield', note: 'Black with tiny stars', bar: '#000000' },
];

export const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
