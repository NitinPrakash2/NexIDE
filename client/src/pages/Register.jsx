import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form.fullName, form.username, form.email, form.password);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">NexIDE</h1>
          <p className="text-zinc-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#18181b] rounded-2xl p-8 space-y-4 border border-zinc-800">
          {['fullName', 'username', 'email', 'password'].map((field) => (
            <div key={field}>
              <label className="block text-sm text-zinc-400 mb-1.5 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                name={field} value={form[field]} onChange={handleChange}
                className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
                placeholder={field === 'password' ? '••••••••' : `Enter ${field}`} required
              />
            </div>
          ))}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-2.5 transition">
            Create Account
          </button>
          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
