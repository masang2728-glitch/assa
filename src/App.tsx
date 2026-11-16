import { useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SessionProvider, useSession } from "./session/SessionContext";
import NameEntryScreen from "./screens/NameEntryScreen";
import HomeScreen from "./screens/HomeScreen";
import CalendarScreen from "./screens/CalendarScreen";
import ScheduleDetailScreen from "./screens/ScheduleDetailScreen";
import MembersScreen from "./screens/MembersScreen";
import RespondScreen from "./screens/RespondScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import MyAttendanceScreen from "./screens/MyAttendanceScreen";
import MoreScreen from "./screens/MoreScreen";
import SplashScreen from "./components/SplashScreen";

function RequireSession({ children }: { children: React.ReactNode }) {
  const { name, part, isLoading } = useSession();
  if (isLoading) return null;
  if (!name || !part) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { name, part, isLoading } = useSession();
  if (isLoading) return null;
  if (name && part) return <Navigate to="/home" replace />;
  return <NameEntryScreen />;
}

// 로그인해야 볼 수 있는 화면들 (예전 주소 /calendar, /schedule/:id 도 그대로 동작)
const PROTECTED: { path: string; element: React.ReactNode }[] = [
  { path: "/home", element: <HomeScreen /> },
  { path: "/calendar", element: <CalendarScreen /> },
  { path: "/schedule/:scheduleId", element: <ScheduleDetailScreen /> },
  { path: "/respond", element: <RespondScreen /> },
  { path: "/attendance", element: <AttendanceScreen /> },
  { path: "/my-attendance", element: <MyAttendanceScreen /> },
  { path: "/members", element: <MembersScreen /> },
  { path: "/more", element: <MoreScreen /> },
];

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SessionProvider>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <HashRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          {PROTECTED.map((r) => (
            <Route key={r.path} path={r.path} element={<RequireSession>{r.element}</RequireSession>} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster position="top-center" />
    </SessionProvider>
  );
}

export default App;
