import './App.css'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from './screens/Landing';
import { Game } from './screens/Game';
import { AuthProvider } from './context/AuthContext';
import { Login } from './screens/Login';
import { Register } from './screens/Register';
import { Profile } from './screens/Profile';
import { NotFound } from './screens/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrivateRoute, PublicRoute } from './components/PrivateRoute';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className='min-h-screen'>
          <BrowserRouter>
            <Routes>
              {/* Public routes — redirect to / if already logged in */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected routes — redirect to /login if not authenticated */}
              <Route element={<PrivateRoute />}>
                <Route path="/game" element={<Game />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Open routes */}
              <Route path="/" element={<Landing />} />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
