import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { fetchMyStats, type PlayerStats } from "../lib/statsApi";

export function StatsPage() {
  const { configured, loading, accessToken, user, signInWithGoogle, signOut } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    fetchMyStats(accessToken)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [accessToken]);

  if (!configured) {
    return (
      <Layout showBack>
        <p className="pong-error">Supabase is not configured. Add keys to `.env` (see README).</p>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout showBack>
        <p className="pong-hint">Loading…</p>
      </Layout>
    );
  }

  if (!user || !accessToken) {
    return (
      <Layout showBack>
        <p className="pong-hint">Sign in to view your stats.</p>
        <button type="button" className="pong-btn pong-btn--primary" onClick={() => signInWithGoogle()}>
          Sign in with Google
        </button>
      </Layout>
    );
  }

  const winRate =
    stats && stats.gamesPlayed > 0
      ? Math.round((stats.wins / stats.gamesPlayed) * 100)
      : 0;

  return (
    <Layout showBack>
      <div className="pong-stats-page">
        <p className="pong-hint">{user.email}</p>
        {error && <p className="pong-error">{error}</p>}
        {stats && (
          <dl className="pong-stats-grid">
            <div>
              <dt>Wins</dt>
              <dd>{stats.wins}</dd>
            </div>
            <div>
              <dt>Losses</dt>
              <dd>{stats.losses}</dd>
            </div>
            <div>
              <dt>Games</dt>
              <dd>{stats.gamesPlayed}</dd>
            </div>
            <div>
              <dt>Win rate</dt>
              <dd>{winRate}%</dd>
            </div>
          </dl>
        )}
        <button type="button" className="pong-btn pong-btn--ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </Layout>
  );
}
