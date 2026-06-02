import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import type { Difficulty } from "../game/types";

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export function SoloSetupPage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  return (
    <Layout showBack backTo="/">
      <div style={{ maxWidth: 400, margin: "0 auto", width: "100%" }}>
        <div className="pong-difficulty">
          <p className="pong-difficulty__label">AI difficulty</p>
          <div className="pong-difficulty__options" role="group" aria-label="AI difficulty">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`pong-difficulty__option${difficulty === d.id ? " pong-difficulty__option--active" : ""}`}
                onClick={() => setDifficulty(d.id)}
                aria-pressed={difficulty === d.id}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="pong-btn pong-btn--primary"
          style={{ width: "100%" }}
          onClick={() => navigate(`/solo/play?difficulty=${difficulty}`)}
        >
          Start game
        </button>
        <Link to="/" className="pong-btn pong-btn--ghost" style={{ width: "100%", marginTop: "0.5rem" }}>
          Cancel
        </Link>
      </div>
    </Layout>
  );
}
