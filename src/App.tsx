/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import ProfileForm from './components/ProfileForm';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { StudentProfile } from './types';
import {
  getProfile,
  getCurrentUser,
  setCurrentUser,
  saveProfile,
  syncWithServerDatabase,
} from './services/storage';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<string | null>(() => getCurrentUser());
  const [viewState, setViewState] = useState<'landing' | 'auth' | 'profile' | 'dashboard'>('landing');
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    if (currentUser) {
      syncWithServerDatabase(currentUser);
      const prof = getProfile(currentUser);
      setProfile(prof);
      if (!prof) {
        setViewState('profile');
      } else {
        setViewState('dashboard');
      }
    } else {
      setProfile(null);
      setViewState('landing');
    }
  }, [currentUser]);

  const handleAuthSuccess = (username: string, isProfileCompleted: boolean) => {
    setCurrentUser(username);
    setCurrentUserState(username);
    if (!isProfileCompleted) {
      setViewState('profile');
    } else {
      const prof = getProfile(username);
      setProfile(prof);
      setViewState('dashboard');
    }
  };

  const handleProfileCompleted = (profileData: Omit<StudentProfile, 'completedAt'>) => {
    if (currentUser) {
      const saved = saveProfile(currentUser, profileData);
      setProfile(saved);
      setViewState('dashboard');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      fetch('/api/presence/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser }),
        keepalive: true
      }).catch(() => {});
    }
    setCurrentUser(null);
    setCurrentUserState(null);
    setProfile(null);
    setViewState('landing');
  };

  if (viewState === 'landing' || (!currentUser && viewState !== 'auth')) {
    return (
      <LandingPage
        onStart={() => setViewState('auth')}
      />
    );
  }

  if (viewState === 'auth') {
    return (
      <AuthModal
        onSuccess={handleAuthSuccess}
        onBackToLanding={() => setViewState('landing')}
      />
    );
  }

  if (viewState === 'profile' && currentUser) {
    return (
      <ProfileForm
        username={currentUser}
        onCompleted={handleProfileCompleted}
        onCancel={() => setViewState('dashboard')}
      />
    );
  }

  if (currentUser) {
    if (currentUser.toLowerCase().trim() === 'ahmed_admin123') {
      return (
        <TeacherDashboard
          username={currentUser}
          onLogout={handleLogout}
        />
      );
    }
    return (
      <Dashboard
        username={currentUser}
        profile={profile}
        onLogout={handleLogout}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          setCurrentUserState(user);
        }}
      />
    );
  }

  return null;
}
