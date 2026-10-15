/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#030712',
          900: '#070d1e',
          850: '#0b132b',
          800: '#111d42',
          700: '#1c2d5a',
          accent: '#00f2fe',
          neon: '#00ff87',
          danger: '#ff2a5f',
          warning: '#ffb703',
          purple: '#8b5cf6',
          muted: '#64748b'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(0, 242, 254, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 242, 254, 0.8), 0 0 35px rgba(0, 255, 135, 0.4)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
