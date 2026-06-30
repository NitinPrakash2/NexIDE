import { useState } from 'react';
import api from '../../api/client';
import { Folder, File, Plus, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

function TreeNode({ node, onOpen, projectId, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [children, setChildren] = useState(node.children || []);
  const [menu, setMenu] = useState(false);

  const loadChildren = async () => {
    if (!expanded && node.type === 'folder' && children.length === 0) {
      try {
        const { data } = await api.get(`/projects/${projectId}/files/tree`);
        const all = data.data?.folders || [];
        const folder = all.find((f) => f.id === node.id);
        setChildren(folder?.children || []);
      } catch {}
    }
    setExpanded(!expanded);
  };

  const deleteNode = async () => {
    try {
      if (node.type === 'folder') await api.delete(`/projects/${projectId}/folders/${node.id}`);
      else await api.delete(`/projects/${projectId}/files/${node.id}`);
      toast.success('Deleted');
      setMenu(false);
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer rounded-lg group text-xs"
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => node.type === 'folder' ? loadChildren() : onOpen(node)}
      >
        {node.type === 'folder' && (
          expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0" />
        )}
        {node.type === 'folder' ? <Folder size={14} className="text-blue-400 shrink-0" /> : <File size={14} className="text-zinc-400 shrink-0" />}
        <span className="text-zinc-300 truncate flex-1">{node.name}</span>
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded">
            <MoreHorizontal size={12} />
          </button>
          {menu && (
            <div className="absolute right-0 top-5 bg-zinc-900 border border-zinc-700 rounded-xl py-1 shadow-xl z-10 w-28"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={deleteNode} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-800">Delete</button>
            </div>
          )}
        </div>
      </div>
      {expanded && children.map((child) => (
        <TreeNode key={child.id} node={child} onOpen={onOpen} projectId={projectId} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FileExplorer({ files, onOpen, projectId, onRefresh }) {
  const [creating, setCreating] = useState(null);
  const [name, setName] = useState('');

  const createNode = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      if (creating === 'folder') await api.post(`/projects/${projectId}/folders`, { name });
      else await api.post(`/projects/${projectId}/files`, { name, content: '' });
      toast.success(`${creating} created`);
      setName('');
      setCreating(null);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Files</span>
        <div className="flex gap-0.5">
          <button onClick={() => setCreating(creating === 'folder' ? null : 'folder')}
            className={`p-1 rounded transition ${creating === 'folder' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
            <Plus size={13} />
          </button>
          <button onClick={() => setCreating(creating === 'file' ? null : 'file')}
            className={`p-1 rounded transition ${creating === 'file' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
            <File size={13} />
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={createNode} className="px-2 pb-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0a0a0b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            placeholder={`${creating} name...`} onBlur={() => { setTimeout(() => { setCreating(null); setName(''); }, 200); }} />
        </form>
      )}

      <div className="space-y-0.5">
        <TreeNode node={{ id: 'root', name: projectId?.slice(0, 8) || 'root', type: 'folder', children: files }} onOpen={onOpen} projectId={projectId} />
      </div>
    </div>
  );
}
