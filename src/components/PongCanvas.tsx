import { useEffect, useRef } from "react";
import { COURT_HEIGHT, COURT_WIDTH } from "../game/constants";
import { drawCourt } from "../game/draw";
import type { GameState } from "../game/types";

interface PongCanvasProps {
  state: GameState;
}

export function PongCanvas({ state }: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = COURT_HEIGHT * (displayWidth / COURT_WIDTH);
      const w = Math.round(displayWidth * dpr);
      const h = Math.round(displayHeight * dpr);
      if (sizeRef.current.w !== w || sizeRef.current.h !== h) {
        sizeRef.current = { w, h, dpr };
        canvas.width = w;
        canvas.height = h;
        // #region agent log
        fetch("http://127.0.0.1:7513/ingest/5b5ba30c-2427-425b-a68a-9fc5b4834741", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b53806" },
          body: JSON.stringify({
            sessionId: "b53806",
            runId: "post-fix",
            hypothesisId: "B",
            location: "PongCanvas.tsx:resize",
            message: "canvas dimensions reset",
            data: { displayWidth, displayHeight, dpr },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let rafId = 0;
    const drawFrame = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { dpr } = sizeRef.current;
        const displayWidth = canvas.clientWidth;
        const scale = displayWidth / COURT_WIDTH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCourt(ctx, stateRef.current, scale);
      }
      rafId = requestAnimationFrame(drawFrame);
    };
    rafId = requestAnimationFrame(drawFrame);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={COURT_WIDTH}
      height={COURT_HEIGHT}
      aria-label="Pong game court"
      role="img"
    />
  );
}
