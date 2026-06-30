import { useState, useRef, useEffect } from 'react';

export default function Terminal({ projectId }) {
  const [lines, setLines] = useState(['Welcome to NexIDE Terminal', 'Type a command and press Enter']);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView(); }, [lines]);

  const runCommand = async (e) => {
    e.preventDefault();
    if (!input.trim() || running) return;

    setLines((prev) => [...prev, `$ ${input}`]);
    setRunning(true);

    // Simulate terminal — real impl would use Socket.IO Docker exec
    const cmd = input.trim();
    setInput('');

    setTimeout(() => {
      if (cmd === 'help') {
        setLines((prev) => [...prev, 'Available commands: help, clear, echo, node, npm, git']);
      } else if (cmd === 'clear') {
        setLines([]);
      } else if (cmd.startsWith('echo ')) {
        setLines((prev) => [...prev, cmd.slice(5)]);
      } else {
        setLines((prev) => [...prev, `Command not found: ${cmd}`, '(Terminal will connect to Docker container in production)']);
      }
      setRunning(false);
    }, 300);
  };

  return (
    <div className="h-full flex flex-col bg-black font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-green-400">●</span>
        <span className="text-zinc-400 text-xs">Terminal</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {lines.map((line, i) => (
          <div key={i} className={line.startsWith('$ ') ? 'text-green-400' : 'text-zinc-300'}>{line}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={runCommand} className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 shrink-0">
        <span className="text-green-400">$</span>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-white focus:outline-none text-xs"
          placeholder={running ? 'Running...' : 'Type a command...'} disabled={running} autoFocus />
      </form>
    </div>
  );
}
