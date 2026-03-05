import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import StudioRoom from "./pages/StudioRoom";
import FloatingStudio from "./pages/FloatingStudio";

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#555",
          fontSize: "14px",
        }}
      >
        Loading...
      </div>
    );
  }

  // The floating window route requires auth but shows the compact view
  if (location.pathname === "/floating") {
    if (!user) return <Navigate to="/" />;
    return <FloatingStudio />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/studio" /> : <Login />}
      />
      <Route
        path="/studio"
        element={user ? <StudioRoom /> : <Navigate to="/" />}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
