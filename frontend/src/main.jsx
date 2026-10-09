import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { MotionConfig, LazyMotion, domAnimation } from './motion/index.js';
import './index.css';

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user" transition={isTestEnv ? { duration: 0 } : undefined}>
      <LazyMotion features={domAnimation}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>
);
