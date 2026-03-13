import "./globals.css";

export const metadata = { title: "EduCanvas — Панель управления" };

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
