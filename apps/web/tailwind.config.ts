import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'oai-surface':      'var(--oai-surface)',
        'oai-muted':        'var(--oai-surface-muted)',
        'oai-line':         'var(--oai-line)',
        'oai-line-muted':   'var(--oai-line-muted)',
        'oai-primary':      'var(--oai-text-primary)',
        'oai-secondary':    'var(--oai-text-secondary)',
        'oai-caption':      'var(--oai-text-caption)',
        'oai-brand':        'var(--oai-brand)',
        'oai-brand-muted':  'var(--oai-brand-muted)',
        'oai-ok':           'var(--oai-ok-text)',
        'oai-ok-bg':        'var(--oai-ok-bg)',
        'oai-warn':         'var(--oai-warn-text)',
        'oai-warn-bg':      'var(--oai-warn-bg)',
        'oai-alert':        'var(--oai-alert-text)',
        'oai-alert-bg':     'var(--oai-alert-bg)',
      },
      borderRadius: {
        oai:    'var(--oai-radius)',
        'oai-sm': 'var(--oai-radius-sm)',
      },
    },
  },
  plugins: [],
}
export default config
