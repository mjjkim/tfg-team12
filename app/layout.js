import "./globals.css";

export const metadata = {
  title: "TFG Team12 Frontend",
  description: "Tech for Good Team 12 baseline Next.js frontend"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="header">TFG Team12</header>
          <main className="main">{children}</main>
          <footer className="footer">Tech for Good · Next.js Starter</footer>
        </div>
      </body>
    </html>
  );
}
