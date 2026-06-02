import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LobbyPage } from "./pages/LobbyPage";
import { OnlinePage } from "./pages/OnlinePage";
import { RoomPage } from "./pages/RoomPage";
import { StatsPage } from "./pages/StatsPage";
import { SoloGamePage } from "./pages/SoloGamePage";
import { SoloSetupPage } from "./pages/SoloSetupPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/solo" element={<SoloSetupPage />} />
        <Route path="/solo/play" element={<SoloGamePage />} />
        <Route path="/online" element={<OnlinePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
