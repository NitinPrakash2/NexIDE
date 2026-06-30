import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCollabStore } from '../store/collabStore';
import { connectSocket, getSocket, joinProject, leaveProject } from '../lib/socket';
import api from '../api/client';
import FileExplorer from '../components/ide/FileExplorer';
import Editor from '../components/ide/Editor';
import Terminal from '../components/ide/Terminal';
import AiChat from '../components/ide/AiChat';
import TeamChat from '../components/ide/TeamChat';
import {
  PanelLeftClose, Terminal as TerminalIcon, MessageSquare, Bot,
  ExternalLink, Users, Activity, LogOut, Wifi, WifiOff,
} from 'lucide-react';

export default function IDE() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { connected, onlineUsers, setConnected, setOnlineUsers, addUser, removeUser } = useCollabStore();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [sidebar, setSidebar] = useState('files');
  const [showTerminal, setShowTerminal] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Load project & files
  useEffect(() => {
    api.get(`/projects/${id}`).then(({ data }) => setProject(data.data)).catch(() => navigate('/dashboard'));
    loadFiles();
  }, [id]);

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = connectSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    if (socket.connected) setConnected(true);

    return () => { leaveProject(id); };
  }, [id, setConnected]);

  // Join project room
  useEffect(() => {
    if (!connected) return;
    const socket = getSocket();
    if (!socket) return;

    joinProject(id);

    socket.on('project:users', (users) => setOnlineUsers(users));
    socket.on('user:joined', (u) => addUser(u));
    socket.on('user:left', ({ userId }) => removeUser(userId));

    return () => {
      socket.off('project:users');
      socket.off('user:joined');
      socket.off('user:left');
    };
  }, [id, connected, setOnlineUsers, addUser, removeUser]);

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/projects/${id}/files/tree`);
      setFiles(data.data?.folders || []);
    } catch {}
  };

  const openFile = useCallback(async (file) => {
    try {
      const { data } = await api.get(`/projects/${id}/files/${file.id}`);
      const fileData = data.data;
      setOpenFiles((prev) => {
        if (prev.find((f) => f.id === fileData.id)) return prev;
        return [...prev, fileData];
      });
      setActiveFile(fileData);
    } catch {}
  }, [id]);

  const closeFile = useCallback((fileId) => {
    setOpenFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === fileId);
      const next = prev.filter((f) => f.id !== fileId);
      if (activeFile?.id === fileId) setActiveFile(next[Math.min(idx, next.length - 1)] || null);
      return next;
    });
  }, [activeFile]);

  const updateFileContent = useCallback((fileId, content) => {
    setOpenFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, content } : f));
    setActiveFile((prev) => prev?.id === fileId ? { ...prev, content } : prev);
  }, []);

  const saveFile = useCallback(async (fileId, content) => {
    try {
      await api.put(`/projects/${id}/files/${fileId}`, { content });
    } catch {}
  }, [id]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0b]">
      {/* Top Bar */}
      <header className="h-11 bg-[#18181b] border-b border-zinc-800 flex items-center px-3 gap-2 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="text-zinc-500 hover:text-white transition">
          <LogOut size={15} />
        </button>
        <span className="text-zinc-400 text-sm font-medium ml-2">{project?.name || 'Loading...'}</span>
        <div className="flex items-center gap-1.5 ml-2">
          {connected ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-red-400" />}
          <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? `${onlineUsers.length} online` : 'offline'}
          </span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowTerminal(!showTerminal)}
          className={`p-1.5 rounded-lg transition ${showTerminal ? 'text-blue-400 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}>
          <TerminalIcon size={15} />
        </button>
        <button onClick={() => setShowAi(!showAi)}
          className={`p-1.5 rounded-lg transition ${showAi ? 'text-blue-400 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}>
          <Bot size={15} />
        </button>
        <button onClick={() => setShowChat(!showChat)}
          className={`p-1.5 rounded-lg transition ${showChat ? 'text-blue-400 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}>
          <MessageSquare size={15} />
        </button>
        <button className="text-zinc-500 hover:text-white p-1.5 rounded-lg transition">
          <ExternalLink size={15} />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-12 bg-[#18181b] border-r border-zinc-800 flex flex-col items-center py-2 gap-1 shrink-0">
          {[
            { id: 'files', icon: PanelLeftClose },
            { id: 'activity', icon: Activity },
            { id: 'users', icon: Users },
          ].map((s) => (
            <button key={s.id} onClick={() => setSidebar(s.id === sidebar ? null : s.id)}
              className={`p-2 rounded-lg transition ${sidebar === s.id ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
              <s.icon size={16} />
            </button>
          ))}
        </div>

        {/* Sidebar Panel */}
        {sidebar && (
          <div className="w-56 bg-[#18181b] border-r border-zinc-800 overflow-y-auto shrink-0">
            {sidebar === 'files' && <FileExplorer files={files} onOpen={openFile} projectId={id} onRefresh={loadFiles} />}
            {sidebar === 'activity' && <div className="p-3 text-zinc-500 text-xs">Activity feed coming soon</div>}
            {sidebar === 'users' && (
              <div className="p-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Team — {onlineUsers.length}</p>
                {onlineUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-medium shrink-0">
                      {u.fullName?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs text-zinc-300 truncate">{u.fullName || u.email}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto shrink-0" />
                  </div>
                ))}
                {onlineUsers.length === 0 && <p className="text-xs text-zinc-600">No other users online</p>}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor Area */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              {openFiles.length > 0 && (
                <div className="h-9 bg-[#18181b] border-b border-zinc-800 flex items-center overflow-x-auto shrink-0">
                  {openFiles.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveFile(f)}
                      className={`flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-zinc-800 whitespace-nowrap transition ${activeFile?.id === f.id ? 'bg-[#0a0a0b] text-white border-t-2 border-t-blue-500' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {f.name}
                      <button onClick={(e) => { e.stopPropagation(); closeFile(f.id); }} className="hover:text-white ml-1">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1">
                {activeFile ? (
                  <Editor file={activeFile} onContentChange={(c) => updateFileContent(activeFile.id, c)} onSave={(c) => saveFile(activeFile.id, c)} />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600">
                    <div className="text-center">
                      <p className="text-lg">Select a file</p>
                      <p className="text-sm mt-1">Open a file from the explorer to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Chat Panel */}
            {showAi && (
              <div className="w-80 border-l border-zinc-800 bg-[#18181b] shrink-0">
                <AiChat projectId={id} />
              </div>
            )}

            {/* Team Chat Panel */}
            {showChat && (
              <div className="w-72 border-l border-zinc-800 bg-[#18181b] shrink-0">
                <TeamChat projectId={id} />
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="h-48 border-t border-zinc-800 bg-black shrink-0">
              <Terminal projectId={id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
