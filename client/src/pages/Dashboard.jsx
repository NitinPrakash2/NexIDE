import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Plus, Search, Star, Clock, FolderOpen, Settings, LogOut, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', language: 'javascript' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.data || [])).catch(() => {});
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/projects', form);
      toast.success('Project created!');
      setShowCreate(false);
      navigate(`/ide/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    }
  };

  const toggleFavorite = async (id, isFav) => {
    try {
      if (isFav) await api.delete(`/projects/${id}/favorite`);
      else await api.post(`/projects/${id}/favorite`);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, isFavorited: !isFav } : p));
    } catch {}
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#18181b]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">NexIDE</h1>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">beta</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/settings')} className="text-zinc-400 hover:text-white transition p-2 rounded-xl hover:bg-zinc-800">
              <Settings size={18} />
            </button>
            <button onClick={logout} className="text-zinc-400 hover:text-red-400 transition p-2 rounded-xl hover:bg-zinc-800">
              <LogOut size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="text-zinc-300">{user?.fullName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search + Create */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              placeholder="Search projects..."
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition">
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/ide/${project.id}`)}
              className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{project.name}</h3>
                    <p className="text-zinc-500 text-xs">{project.language}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id, project.isFavorited); }}
                  className={`p-1.5 rounded-lg transition ${project.isFavorited ? 'text-yellow-400' : 'text-zinc-600 opacity-0 group-hover:opacity-100'}`}
                >
                  <Star size={15} fill={project.isFavorited ? 'currentColor' : 'none'} />
                </button>
              </div>
              {project.description && (
                <p className="text-zinc-500 text-xs line-clamp-2 mb-3">{project.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(project.updatedAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><FolderOpen size={12} /> {(project._count?.files || 0)} files</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-zinc-600">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-[#18181b] rounded-2xl p-8 w-full max-w-md border border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-white mb-6">New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none" rows={3} />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Language</label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                  {['javascript', 'typescript', 'python', 'html', 'css'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2.5 text-sm transition">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
