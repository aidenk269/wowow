const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function createRoom(): Promise<{ code: string }> {
  const res = await fetch(`${API_BASE}/api/rooms`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Could not create room");
  }
  return res.json();
}

export async function joinRoom(code: string): Promise<{ code: string }> {
  const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Could not join room");
  }
  return res.json();
}
