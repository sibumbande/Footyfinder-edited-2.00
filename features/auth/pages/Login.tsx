
import React from 'react';
import { Logo } from '../../../components/shared/ui/Logo';
import { login, ApiError } from '../../../frontend/api';

interface LoginProps {
  onLoginSuccess: (user: { id: string; email: string; username: string; fullName: string; position: string | null; fitnessLevel: string | null; city: string | null }) => void;
  onNavigateToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login({ email, password });
      onLoginSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 animate-fade-in-up">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-8">Sign in to book your next match</p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="player@example.com"
              disabled={loading}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <button className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12.0003 20.45C16.6669 20.45 20.5847 16.5332 20.5847 11.8665H12.0003V20.45Z" fill="#34A853" fillOpacity="0" />
                <path d="M22.56 12.2571C22.56 11.47 22.49 10.72 22.35 10H12V14.22H17.92C17.66 15.58 16.88 16.73 15.71 17.51V20.25H19.27C21.35 18.33 22.56 15.51 22.56 12.2571Z" fill="#4285F4" />
                <path d="M12 23C14.97 23 17.46 20.98 19.27 18.31L15.71 15.58C14.72 16.24 13.46 16.64 12 16.64C9.13 16.64 6.7 14.7 5.83 12.14H2.16V14.98C3.98 18.6 7.72 23 12 23Z" fill="#34A853" />
                <path d="M5.83 12.14C5.61 11.37 5.49 10.55 5.49 9.71C5.49 8.87 5.61 8.05 5.83 7.28V4.44H2.16C0.79 7.17 0 9.71 0 9.71C0 9.71 0.79 12.25 2.16 14.98L5.83 12.14Z" fill="#FBBC05" />
                <path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.33 3.91C17.45 2.16 14.97 1 12 1C7.72 1 3.98 5.4 2.16 9.02L5.83 11.86C6.7 9.3 9.13 5.38 12 5.38Z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-gray-500">Don't have an account? </span>
          <button onClick={onNavigateToSignup} className="font-bold text-blue-600 hover:text-blue-500">
            Create Profile
          </button>
        </div>
      </div>
    </div>
  );
};
