/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Montserrat"', 'sans-serif'],
            },
            colors: {
                background: '#F8F7F4', // Alabaster
                primary: '#1A1A1A',    // Deep Charcoal
                luxury: {
                    gold: '#C6A35E',     // Muted Gold
                    midnight: '#0F172A', // Deep Slate
                }
            },
            boxShadow: {
                'soft': '0 4px 20px rgba(0,0,0,0.05)',
            }
        },
    },
    plugins: [],
}
