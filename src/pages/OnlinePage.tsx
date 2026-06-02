import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { createRoom, joinRoom } from "../lib/api";

export function OnlinePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleHost() {
    setLoading(true);
    setError(null);
    try {
      const { code } = await createRoom();
      navigate(`/room/${code}?role=host`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter a valid room code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await joinRoom(code);
      navigate(`/room/${code}?role=guest`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout showBack>
      {mode === "choose" ? (
        <nav className="pong-menu" aria-label="Online options">
          <button
            type="button"
            className="pong-btn pong-btn--primary"
            onClick={handleHost}
            disabled={loading}
          >
            {loading ? "Creating…" : "Host game"}
          </button>
          <button
            type="button"
            className="pong-btn"
            onClick={() => setMode("join")}
            disabled={loading}
          >
            Join game
          </button>
        </nav>
      ) : (
        <form className="pong-join-form" onSubmit={handleJoin}>
          <label className="pong-join-form__label" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            className="pong-join-form__input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7M2"
            maxLength={6}
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            className="pong-btn pong-btn--primary"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Joining…" : "Join"}
          </button>
          <button
            type="button"
            className="pong-btn pong-btn--ghost"
            onClick={() => {
              setMode("choose");
              setError(null);
            }}
          >
            Back
          </button>
        </form>
      )}
      {error && (
        <p className="pong-error" role="alert">
          {error}
        </p>
      )}
    </Layout>
  );
}
