import React, { useEffect } from 'react';
import { MapView } from '../components/map/MapView';
import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';

export function MapPage() {
  const { isLoggedIn } = useUserStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);
  
  return (
    <div className="h-full w-full">
      <MapView />
    </div>
  );
}