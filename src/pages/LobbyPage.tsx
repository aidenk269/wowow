import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";

export function LobbyPage() {
  const { configured, user } = useAuth();

  return (
    <Layout>
      {configured && user && (
        <p className="pong-lobby-stats">
          Signed in · <Link to="/stats">My stats</Link>
        </p>
      )}
      <nav className="pong-menu" aria-label="Main menu">
        <Link to="/solo" className="pong-btn pong-btn--primary">
          Play vs AI
        </Link>
        <Link to="/online" className="pong-btn">
          Online
        </Link>
      </nav>
      <p className="pong-hint" style={{ marginTop: "2rem" }}>
        First to 11 points wins
      </p>
    </Layout>
  );
}
