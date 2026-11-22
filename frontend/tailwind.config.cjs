/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      graphite: { DEFAULT: 'var(--sf-primary)', 2: 'var(--sf-primary-2)', 800: 'var(--sf-primary-800)' },
      ink: '#17191C', foreground: 'var(--sf-ink)',
      signal: { DEFAULT: 'var(--sf-signal)', hover: 'var(--sf-signal-hover)', text: 'var(--sf-signal-text)' },
      paper: 'var(--sf-bg)', wash: 'var(--sf-wash)', line: 'var(--sf-line)', border: 'var(--sf-border)',
      'text-secondary': 'var(--sf-text-2)'
    },
    fontFamily: { body: ['Inter','system-ui','sans-serif'], display: ['Sora','Inter','sans-serif'], mono: ['IBM Plex Mono','monospace'] },
    borderRadius: { docket: '4px' }
  } },
  plugins: []
}
