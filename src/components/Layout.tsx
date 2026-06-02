import { Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
}

export function Layout({
  children,
  showBack = false,
  backTo = "/",
  backLabel = "Back to lobby",
}: LayoutProps) {
  return (
    <div className="pong-shell">
      <header className="pong-header">
        <h1 className="pong-header__title">Pong</h1>
      </header>
      {showBack && (
        <Link to={backTo} className="pong-btn pong-btn--ghost" style={{ marginBottom: "1rem" }}>
          ← {backLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
