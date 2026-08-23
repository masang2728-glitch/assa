import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SessionProvider, useSession } from "./session/SessionContext";
import NameEntryScreen from "./screens/NameEntryScreen";
import CalendarScreen from "./screens/CalendarScreen";
import ScheduleDetailScreen from "./screens/ScheduleDetailScreen";

function RequireSession({ children }: { children: React.ReactNode }) {
  const { name, part, isLoading } = useSession();
  if (isLoading) return null;
  if (!name || !part) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { name, part, isLoading } = useSession();
  if (isLoading) return null;
  if (name && part) return <Navigate to="/calendar" replace />;
  return <NameEntryScreen />;
}

function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/calendar"
            element={
              <RequireSession>
                <CalendarScreen />
              </RequireSession>
            }
          />
          <Route
            path="/schedule/:scheduleId"
            element={
              <RequireSession>
                <ScheduleDetailScreen />
              </RequireSession>
            }
          />
        </Routes>
      </HashRouter>
      <Toaster position="top-center" />
    </SessionProvider>
  );
}

export default App;
