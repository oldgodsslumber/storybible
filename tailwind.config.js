/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        card: {
          character: '#fbbf24',
          object:    '#a78bfa',
          location:  '#34d399',
          scene:     '#60a5fa',
          dialogue:  '#f472b6',
          history:   '#fb923c',
          arc:       '#22d3ee',
          theme:     '#e879f9',
          obstacle:  '#f87171',
          descriptor:'#94a3b8',
          beat:      '#86efac',
        },
      },
    },
  },
  plugins: [],
};
