/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "primary-hover": "#106ac5",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
                "card-dark": "#1c2127",
                "surface-light": "#ffffff",
                "surface-dark": "#1c232d",
                "border-light": "#e2e8f0",
                "border-dark": "#283039",
                "input-bg": "#111418",
                cobalt: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                zinc: {
                    950: '#09090b',
                    900: '#18181b',
                    800: '#27272a',
                    700: '#3f3f46',
                },
            },
            fontFamily: {
                "display": ["Manrope", "Noto Sans", "sans-serif"]
            },
            borderRadius: {
                "lg": "0.5rem",
                "xl": "0.75rem",
            },
        },
    },
    plugins: [],
}
