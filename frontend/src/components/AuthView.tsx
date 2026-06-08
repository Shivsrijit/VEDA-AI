'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, School, AlertCircle, Loader } from 'lucide-react';
import { useAssignmentStore } from '../store/useAssignmentStore';
import styles from '../styles/auth.module.css';

export default function AuthView() {
  const { login, register, isLoading, error: apiError } = useAssignmentStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Simple validations
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all mandatory credentials.');
      return;
    }

    if (!isLogin && (!name.trim() || !schoolName.trim())) {
      setLocalError('Please provide your name and school name to register.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, schoolName);
      }
    } catch (err: any) {
      console.error('Authentication request failure:', err);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError(null);
  };

  return (
    <div className={styles.authContainer}>
      <div className={`${styles.authCard} animate-slide-up`}>
        <div className={styles.logoArea}>
          <img src="/logo.png" alt="QRaft Logo" className={styles.logoImg} />
          <div>
            <h2 className={styles.logoText}>
              Q<span className={styles.logoHighlight}>Raft</span>
            </h2>
            <p className={styles.cardSubtitle}>
              {isLogin
                ? 'Sign in to access your assessment console'
                : 'Create your academic profile to generate papers'}
            </p>
          </div>
        </div>

        {(localError || apiError) && (
          <div className={styles.errorAlert}>
            <AlertCircle size={18} />
            <span>{localError || apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>School Name</label>
                <div className={styles.inputWrapper}>
                  <School size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className={styles.input}
                    placeholder="School Name Here"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="teacher@school.edu"
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <Loader size={18} className="animate-spin" />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className={styles.toggleContainer}>
          <span>
            {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
          </span>
          <button onClick={handleToggleMode} className={styles.toggleBtn}>
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
