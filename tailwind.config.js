/**
 * Tema "Huerto": verde de huerto, terracota y fondo arena (rediseño 2026, ver el canvas de diseño).
 *
 * Las escalas slate/emerald/amber/red/blue/sky se reemplazan por tonos calidos en vez de agregar
 * colores nuevos: asi las ~25 vistas existentes, escritas con esas clases, toman la paleta nueva
 * sin tocarlas una por una. Cada escala conserva su papel (slate = neutros, emerald = exito y
 * acento principal, amber = pendiente, red = error/ocupado, blue = informativo, sky = en limpieza).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutros calidos (arena -> tinta).
        slate: {
          50: "#FBF7F0",
          100: "#F4EEE3",
          200: "#E6DCCB",
          300: "#D9CDB8",
          400: "#8C8270",
          500: "#6E6555",
          600: "#5B5446",
          700: "#3F3A2E",
          800: "#2B271E",
          900: "#1F1B12",
          950: "#14110B",
        },
        // Verde de huerto: acento principal y estados "bien".
        emerald: {
          50: "#F1F6EE",
          100: "#E7F0E2",
          200: "#CFE0C8",
          300: "#A9C99E",
          400: "#7FAF72",
          500: "#4F8A45",
          600: "#3B6E34",
          700: "#2D5A27",
          800: "#23501E",
          900: "#1E3F1A",
          950: "#12260F",
        },
        // Ocre: pendiente / atencion.
        amber: {
          50: "#FDF8EC",
          100: "#FCF3DF",
          200: "#EFDDB1",
          300: "#E2C27C",
          400: "#D2A24A",
          500: "#C9962B",
          600: "#A87A1C",
          700: "#8A5A0B",
          800: "#7A4F08",
          900: "#5A3D07",
          950: "#3A2704",
        },
        // Terracota rojiza: errores, ocupado, cancelado.
        red: {
          50: "#FDF3EF",
          100: "#FCEEE8",
          200: "#F2CDBE",
          300: "#E8A98F",
          400: "#D9785A",
          500: "#C4532F",
          600: "#B0431F",
          700: "#9C3E1B",
          800: "#8A2E12",
          900: "#6E240E",
          950: "#481707",
        },
        // Azul informativo (reservado, en curso).
        blue: {
          50: "#EEF4FB",
          100: "#E4EDF8",
          200: "#C6D8EF",
          300: "#9DBCE3",
          400: "#6F98CF",
          500: "#3B6FB6",
          600: "#2F5E9F",
          700: "#1F4E8C",
          800: "#173E70",
          900: "#10305A",
          950: "#0A1F3B",
        },
        // Verde agua: en limpieza.
        sky: {
          50: "#F0F8F8",
          100: "#E0F1F1",
          200: "#BFE0E1",
          300: "#93C8CA",
          400: "#5FA3A7",
          500: "#3F8A8E",
          600: "#2E7175",
          700: "#215C60",
          800: "#0F5257",
          900: "#0B3D41",
          950: "#06272A",
        },
        // Nombres propios del tema para codigo nuevo.
        huerto: { DEFAULT: "#2D5A27", oscuro: "#1E3F1A", suave: "#E7F0E2" },
        terracota: { DEFAULT: "#B4532A", oscuro: "#8A3A14", suave: "#FDF1EA" },
        arena: { DEFAULT: "#FBF7F0", 2: "#F4EEE3", borde: "#E6DCCB" },
        tinta: "#1F1B12",
        primary: "#2D5A27",
        secondary: "#1E3F1A",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Playfair Display"', "Georgia", "serif"],
      },
      fontSize: {
        // Un poco mas grande que el xs por defecto (12 px): el sistema se usa todo el dia en recepcion.
        xs: ["0.8125rem", { lineHeight: "1.2rem" }],
      },
    },
  },
  plugins: [],
};
