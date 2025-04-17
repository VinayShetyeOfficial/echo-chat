import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import InvitePage from "./pages/InvitePage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();

// Protected route component that checks authentication
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-10 h-10 border-4 border-chat-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" replace />;
}

// Auth route component that redirects to chat if authenticated
function AuthRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-10 h-10 border-4 border-chat-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return !user ? children : <Navigate to="/chat" replace />;
}

// Add a ChatRoute component that wraps Chat with ChatProvider
function ChatRoute() {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/chat" : "/auth"} />} />
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatRoute />
          </ProtectedRoute>
        }
      />
      <Route path="/invite/:code" element={<InvitePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
