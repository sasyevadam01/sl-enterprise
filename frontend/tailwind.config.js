/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                brand: {
                    green: {
                        50: '#f0fdf0',
                        100: '#dcfcdc',
                        200: '#bbf7bb',
                        300: '#86ef86',
                        400: '#4ade4a',
                        500: '#2D8C0E',
                        600: '#1E6B08',
                        700: '#166006',
                        800: '#134d08',
                        900: '#0f3d08',
                        DEFAULT: '#2D8C0E',
                    },
                    orange: {
                        50: '#fff7ed',
                        100: '#ffedd5',
                        200: '#fed7aa',
                        300: '#fdba74',
                        400: '#fb923c',
                        500: '#E6620F',
                        600: '#C44F08',
                        700: '#9a3412',
                        800: '#7c2d12',
                        900: '#631f0a',
                        DEFAULT: '#E6620F',
                    },
                },
                surface: {
                    DEFAULT: '#FFFFFF',
                    50: '#FAFBFC',
                    100: '#F5F6FA',
                    200: '#EBEDF3',
                    300: '#D1D5DB',
                },
                sidebar: {
                    DEFAULT: '#1A1F2E',
                    light: '#232940',
                    hover: '#2A3150',
                },
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                'elevated': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
                'nav': '0 1px 3px rgba(0,0,0,0.06)',
            },
            borderRadius: {
                'xl': '0.875rem',
                '2xl': '1rem',
                '3xl': '1.25rem',
            },
        },
    },
    plugins: [],
}
