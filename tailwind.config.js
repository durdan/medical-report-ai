/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'medical-blue': '#3B82F6',
        'medical-green': '#10B981',
        'medical-gray': '#6B7280',
      },
      fontFamily: {
        'medical': ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
            h1: {
              color: 'inherit',
              marginTop: '1.5rem',
              marginBottom: '1rem',
            },
            h2: {
              color: 'inherit',
              marginTop: '1.25rem',
              marginBottom: '0.75rem',
            },
            h3: {
              color: 'inherit',
              marginTop: '1rem',
              marginBottom: '0.5rem',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            code: {
              color: 'inherit',
              backgroundColor: '#f0f0f0',
              padding: '0.2em 0.4em',
              borderRadius: '3px',
              fontSize: '0.9em',
            },
            pre: {
              backgroundColor: '#f5f5f5',
              padding: '1em',
              borderRadius: '5px',
              overflow: 'auto',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
