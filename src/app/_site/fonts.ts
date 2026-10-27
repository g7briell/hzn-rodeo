import { Inter, Saira } from "next/font/google";

// Saira Black Italic é a face pública mais próxima do letreiro do logo e dos títulos do app.
export const fonteDisplay = Saira({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const fonteTexto = Inter({
  subsets: ["latin"],
  variable: "--font-texto",
  display: "swap",
});
