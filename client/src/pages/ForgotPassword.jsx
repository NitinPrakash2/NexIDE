import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset email sent!');
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">NexIDE</h1>
          <p className="text-zinc-400 mt-2">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#18181b] rounded-2xl p-8 space-y-5 border border-zinc-800">
          {sent ? (
            <p className="text-green-400 text-center">Check your email for reset instructions.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
                  placeholder="you@example.com" required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-2.5 transition">
                Send Reset Link
              </button>
            </>
          )}
          <p className="text-center text-sm text-zinc-500">
            <Link to="/login" className="text-blue-400 hover:text-blue-300">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
