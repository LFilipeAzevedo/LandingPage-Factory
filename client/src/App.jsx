import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Admin/Login';
import Register from './components/Admin/Register';
import VerifyEmail from './components/Admin/VerifyEmail';
import ResetPassword from './components/Admin/ResetPassword';
import Editor from './components/Admin/Editor';
import Plans from './components/Admin/Plans';
import LandingPage from './components/Public/LandingPage'; // Placeholder, will create next

import AdminUsers from './components/Admin/AdminUsers';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/admin/login" />;
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
          <Route path="/admin/plans" element={
            <ProtectedRoute>
              <Plans />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <AdminUsers />
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
