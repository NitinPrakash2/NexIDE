import { useRef, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';

loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

const EXT_MAP = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
  xml: 'xml', yml: 'yaml', yaml: 'yaml', sh: 'shell', sql: 'sql',
};

export default function CodeEditor({ file, onContentChange, onSave }) {
  const editorRef = useRef(null);

  const handleMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 49) { // Ctrl+S
        e.preventDefault();
        onSave?.(editor.getValue());
      }
    });
  }, [onSave]);

  const ext = file?.name?.split('.').pop() || '';
  const language = EXT_MAP[ext] || 'plaintext';

  return (
    <Editor
      height="100%"
      language={language}
      value={file?.content || ''}
      theme="vs-dark"
      onChange={(val) => onContentChange?.(val || '')}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 8 },
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        tabSize: 2,
      }}
    />
  );
}
