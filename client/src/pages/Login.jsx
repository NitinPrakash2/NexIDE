import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">NexIDE</h1>
          <p className="text-zinc-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#18181b] rounded-2xl p-8 space-y-5 border border-zinc-800">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••" required
            />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">Forgot password?</Link>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-2.5 transition">
            Sign In
          </button>
          <p className="text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
