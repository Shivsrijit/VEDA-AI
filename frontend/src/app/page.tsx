'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AssignmentForm from '../components/AssignmentForm';
import GenerationProgress from '../components/GenerationProgress';
import QuestionPaper from '../components/QuestionPaper';
import AssignmentsList from '../components/AssignmentsList';
import SettingsPanel from '../components/SettingsPanel';
import HomeView from '../components/HomeView';
import ToolkitView from '../components/ToolkitView';
import AuthView from '../components/AuthView';
import { useAssignmentStore } from '../store/useAssignmentStore';
import styles from '../styles/layout.module.css';

import { LayoutGrid, FileText, PieChart, Sparkles, Loader } from 'lucide-react';

export default function Page() {
  const { 
    activeStep, 
    activeView, 
    setView, 
    setCurrentAssignment, 
    darkMode, 
    initializeSettings,
    isAuthenticated,
    checkAuth
  } = useAssignmentStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Initialize client settings from localStorage on mount and check user token session
  useEffect(() => {
    initializeSettings();
    const verifySession = async () => {
      await checkAuth();
      setIsCheckingSession(false);
    };
    verifySession();
  }, [initializeSettings, checkAuth]);

  // Synchronize document theme class with persistent settings state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [darkMode]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Render a clean, premium load state during startup session check
  if (isCheckingSession) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          width: '100vw',
          backgroundColor: darkMode ? '#0b0f19' : '#eaeaea',
          color: darkMode ? '#f8fafc' : '#0f172a',
          gap: '20px'
        }}
      >
        <Loader size={36} className="animate-spin" style={{ color: 'var(--primary, #6366f1)' }} />
        <span style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.02em', opacity: 0.8 }}>
          Verifying secure session credentials...
        </span>
      </div>
    );
  }

  // Force login/signup route view if unauthenticated
  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className={styles.appContainer}>
      {/* 1. Curved Left Sidebar (Responsive drawer open/close hooks) */}
      <Sidebar 
        activeTab="assignments" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* 2. Main Dashboard panel gutter */}
      <div className={styles.mainPanel}>
        
        {/* Header Navbar controls */}
        <Header 
          title="Assignments" 
          onMenuClick={toggleSidebar} 
        />

        {/* 3. Central responsive viewport content container */}
        <main className={styles.contentViewport}>
          {activeView === 'home' && <HomeView />}
          {activeView === 'toolkit' && <ToolkitView />}
          {activeView === 'list' && <AssignmentsList />}
          {activeView === 'settings' && <SettingsPanel />}
          {activeView === 'create' && (
            <>
              {activeStep === 1 && (
                <div className="animate-fade-in">
                  <AssignmentForm />
                </div>
              )}
              
              {activeStep === 2 && (
                <div className="animate-slide-up">
                  <GenerationProgress />
                </div>
              )}
              
              {activeStep === 3 && (
                <div className="animate-fade-in">
                  <QuestionPaper />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <div className={styles.mobileBottomNav}>
        <button 
          className={`${styles.mobileNavItem} ${activeView === 'home' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setView('home')}
        >
          <LayoutGrid size={20} />
          <span>Home</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeView === 'list' || activeView === 'create' ? styles.mobileNavItemActive : ''}`}
          onClick={() => {
            setCurrentAssignment(null);
            setView('list');
          }}
        >
          <FileText size={20} />
          <span>Assignments</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeView === 'toolkit' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setView('toolkit')}
        >
          <Sparkles size={20} />
          <span>AI Toolkit</span>
        </button>
      </div>
    </div>
  );
}
