import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Admin/Login';
import Register from './components/Admin/Register';
import VerifyEmail from './components/Admin/VerifyEmail';
import ResetPassword from './components/Admin/ResetPassword';
import Editor from './components/Admin/Editor';
import LandingPage from './components/Public/LandingPage'; // Placeholder, will create next

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/admin/login" />;
  }

  // Prevent users with 'static' plan from accessing the editor
  if (user.plan_tier === 'static') {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/register" element={<Register />} />
          <Route path="/admin/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/admin/reset-password/:token" element={<ResetPassword />} />
          <Route path="/admin/editor" element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          } />

          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/admin/login" />} />
          <Route path="/:slug" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
