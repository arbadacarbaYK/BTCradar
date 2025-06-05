import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import { useLocationStore } from './store/locationStore';
import { MapView } from './components/map/MapView';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';
import { BottomNav } from './components/BottomNav';
import { ErrorFallback } from './components/ErrorFallback';
import { ErrorBoundary } from 'react-error-boundary';
import { LoginPage } from './pages/LoginPage';

function App() {
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const hydrated = useUserStore(state => state.hydrated);
  const setHydrated = useUserStore((state) => state.setHydrated);
  const checkLocationPermission = useLocationStore(state => state.checkLocationPermission);

  // Debug logs for hydration
  console.log('App render: hydrated =', hydrated);

  // Only check location permission after login
  useEffect(() => {
    if (isLoggedIn) {
      checkLocationPermission();
    }
  }, [isLoggedIn, checkLocationPermission]);

  // Patch: ensure hydrated is set after mount
  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
    }
  }, [hydrated, setHydrated]);

  // TEMP: Comment out hydration check for debugging
  // if (!hydrated) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <svg className="animate-spin h-8 w-8 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
  //       <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading…</span>
  //     </div>
  //   );
  // }

  return (
    <Router>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Routes>
          {!isLoggedIn ? (
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<MapView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
        <Navigation />
        <BottomNav />
      </ErrorBoundary>
    </Router>
  );
}

export default App;