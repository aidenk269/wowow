import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchStatsConfig, recordMatch } from "../lib/statsApi";

interface SaveStatsPromptProps {
  won: boolean;
  mode: "solo" | "online";
  /** Online matches saved automatically on server when signed in before play */
  autoSaved?: boolean;
}

export function SaveStatsPrompt({ won, mode, autoSaved = false }: SaveStatsPromptProps) {
  const { configured, accessToken, signInWithGoogle, user } = useAuth();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    autoSaved ? "saved" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const soloSaveStarted = useRef(false);

  useEffect(() => {
    fetchStatsConfig().then((c) => setServerEnabled(c.enabled));
  }, []);

  useEffect(() => {
    if (autoSaved) {
      setStatus("saved");
    }
  }, [autoSaved]);

  useEffect(() => {
    if (autoSaved || mode !== "solo" || !accessToken || !serverEnabled) return;
    if (soloSaveStarted.current) return;
    soloSaveStarted.current = true;

    let cancelled = false;
    setStatus("saving");
    recordMatch(accessToken, won, "solo")
      .then(() => {
        if (!cancelled) setStatus("saved");
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Could not save");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, autoSaved, mode, serverEnabled, status, won]);

  if (!configured || !serverEnabled) {
    return (
      <p className="pong-overlay__sub" style={{ fontSize: "0.8rem" }}>
        Stats require Supabase setup (see README).
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p className="pong-stats-saved">
        Stats saved
        {user && (
          <>
            {" "}
            · <Link to="/stats">View stats</Link>
          </>
        )}
      </p>
    );
  }

  if (status === "saving") {
    return <p className="pong-overlay__sub">Saving stats…</p>;
  }

  if (!accessToken) {
    return (
      <div className="pong-save-stats">
        <p className="pong-overlay__sub">Save this match to your record?</p>
        <button
          type="button"
          className="pong-btn pong-btn--small"
          onClick={() => signInWithGoogle().catch((e) => setError(String(e)))}
        >
          Sign in with Google
        </button>
        {error && <p className="pong-error">{error}</p>}
      </div>
    );
  }

  if (status === "error") {
    return <p className="pong-error">{error}</p>;
  }

  return null;
}
