import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        background: '#030303',
        surface: '#0a0a0a',
        'surface-elevated': '#121212',
        border: '#222222',
        accent: '#E53935', // Cinematic Crimson
        'accent-hover': '#FF5252',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a0a0a0',
        'text-muted': '#666666',
      },
      animation: {
        'drift-slow': 'drift 40s linear infinite',
        'drift-slower': 'drift 60s linear infinite reverse',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '100%': { transform: 'translate(-50px, -50px) rotate(5deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      boxShadow: {
        'cinematic': '0 24px 80px -12px rgba(0,0,0,0.8), 0 0 40px -10px rgba(229,57,53,0.15)',
        'glow': '0 0 20px 0 rgba(229,57,53,0.4)',
      }
    }
  },
  plugins: []
};

export default config;
