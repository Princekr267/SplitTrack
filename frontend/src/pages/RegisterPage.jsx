import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Split, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { Card } from '../components/common/Card.jsx';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!name || !email || !password) return;

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      addToast('Account created successfully! Welcome to SplitTrack 🎉', 'success');
      navigate(returnUrl);
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <Split className="w-6 h-6 font-bold" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-text">SplitTrack</span>
        </Link>
        <h2 className="text-xl font-bold text-text">Create your account</h2>
        <p className="mt-1 text-xs text-text-muted">
          Already have an account?{' '}
          <Link
            to={
              searchParams.get('returnUrl')
                ? `/login?returnUrl=${encodeURIComponent(searchParams.get('returnUrl'))}`
                : '/login'
            }
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              required
              placeholder="e.g. Vikram Malhotra"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Minimum 6 characters for host security"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="p-1 hover:text-text transition focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Create Account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
