"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SageMessage } from "../../../lib/agents/sage";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type FileNode = {
  path: string;
  sha: string;
};

type WorkspaceClientProps = {
  repoFullName: string;
  issueNumber: number;
  user: {
    name?: string;
    nickname?: string;
    picture?: string;
  };
};

export default function WorkspaceClient({ repoFullName, issueNumber }: WorkspaceClientProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [issueData, setIssueData] = useState<{ title: string; body: string } | null>(null);

  const [sageMessages, setSageMessages] = useState<SageMessage[]>([]);
  const [sageInput, setSageInput] = useState("");
  const [sageLoading, setSageLoading] = useState(false);

  const [terminalLines, setTerminalLines] = useState<string[]>([
    "Welcome to Forge — E2B cloud sandbox",
    "Type a command and press Enter to run it.",
    "$ ",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalError, setTerminalError] = useState<string | null>(null);

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sageMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFileTree(); loadIssue(); }, []);

  async function loadFileTree() {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/agents/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName }),
      });
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  }

  async function loadIssue() {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/issues/${issueNumber}`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (res.ok) {
        const data = await res.json();
        setIssueData({ title: data.title, body: data.body || "" });
      }
    } catch {
      // ignore
    }
  }

  async function openFile(path: string) {
    setLoadingFile(true);
    setSelectedFile(path);
    try {
      const res = await fetch("/api/agents/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName, path }),
      });
      const data = await res.json();
      setFileContent(data.content || "");
    } catch {
      setFileContent("// Could not load file");
    } finally {
      setLoadingFile(false);
    }
  }

  const getLanguage = (path: string) => {
    const ext = path.split(".").pop() || "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
      py: "python", rs: "rust", go: "go", java: "java", rb: "ruby",
      cpp: "cpp", c: "c", cs: "csharp", php: "php", swift: "swift",
      json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
      html: "html", css: "css", sh: "shell", bash: "shell",
    };
    return map[ext] || "plaintext";
  };

  async function sendToSage(overrideInput?: string, errorCtx?: string) {
    const input = overrideInput || sageInput.trim();
    if (!input && !errorCtx) return;

    const userMsg: SageMessage = { role: "user", content: errorCtx ? `I got this error:\n${errorCtx}` : input };
    const newMessages = [...sageMessages, userMsg];
    setSageMessages(newMessages);
    setSageInput("");
    setSageLoading(true);

    try {
      const res = await fetch("/api/agents/sage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            fileName: selectedFile || undefined,
            fileContent: fileContent ? fileContent.slice(0, 3000) : undefined,
            errorMessage: errorCtx,
            issueTitle: issueData?.title,
            issueBody: issueData?.body?.slice(0, 500),
          },
        }),
      });
      const data = await res.json();
      setSageMessages([...newMessages, { role: "assistant", content: data.reply || "What do you think is happening here?" }]);
    } catch {
      setSageMessages([...newMessages, { role: "assistant", content: "I had trouble connecting. What do you think is happening in this code?" }]);
    } finally {
      setSageLoading(false);
    }
  }

  async function runTerminalCommand() {
    const cmd = terminalInput.trim();
    if (!cmd) return;
    setTerminalInput("");
    setTerminalLines((prev) => [...prev.slice(0, -1), `$ ${cmd}`]);

    // Simulate E2B execution (in production, this would call E2B API)
    try {
      const mockOutput = await simulateE2B(cmd);
      const lines = mockOutput.split("\n");
      setTerminalLines((prev) => [...prev, ...lines, "$ "]);

      // Check for errors and auto-trigger Sage
      const errorLines = lines.filter((l) =>
        /error|exception|traceback|typeerror|syntaxerror|nameerror/i.test(l)
      );
      if (errorLines.length > 0) {
        setTerminalError(mockOutput);
        setTimeout(() => {
          sendToSage(undefined, mockOutput.slice(0, 800));
          setTerminalError(null);
        }, 500);
      }
    } catch {
      setTerminalLines((prev) => [...prev, "Error running command", "$ "]);
    }
  }

  // Build tree structure from flat file list
  const buildTree = useCallback((files: FileNode[]) => {
    const tree: Record<string, string[]> = {};
    const rootFiles: string[] = [];

    for (const f of files) {
      const parts = f.path.split("/");
      if (parts.length === 1) {
        rootFiles.push(f.path);
      } else {
        const dir = parts[0];
        if (!tree[dir]) tree[dir] = [];
        tree[dir].push(f.path);
      }
    }
    return { tree, rootFiles };
  }, []);

  const { tree: dirTree, rootFiles } = buildTree(files);

  const toggleDir = (dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-medium text-white">{repoFullName}</span>
          {issueData && (
            <>
              <span className="text-zinc-700">/</span>
              <span className="text-xs text-zinc-400 max-w-xs truncate">#{issueNumber}: {issueData.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-violet-500/20 text-violet-400 px-2 py-1 rounded">Forge</span>
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Sage</span>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded">E2B</span>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-52 shrink-0 border-r border-zinc-800 overflow-y-auto bg-zinc-900/40 text-xs">
          <div className="px-3 py-2 text-zinc-500 font-medium uppercase tracking-wide text-[10px]">
            Explorer
          </div>
          {loadingFiles ? (
            <div className="px-3 py-2 text-zinc-600">Loading...</div>
          ) : (
            <div>
              {rootFiles.map((f) => (
                <FileItem
                  key={f}
                  path={f}
                  selected={selectedFile === f}
                  onClick={() => openFile(f)}
                />
              ))}
              {Object.entries(dirTree).map(([dir, children]) => (
                <div key={dir}>
                  <button
                    onClick={() => toggleDir(dir)}
                    className="w-full text-left px-3 py-1 flex items-center gap-1 hover:bg-zinc-800 text-zinc-400"
                  >
                    <span>{expandedDirs.has(dir) ? "▾" : "▸"}</span>
                    <span className="text-zinc-300 font-medium">{dir}/</span>
                  </button>
                  {expandedDirs.has(dir) && (
                    <div className="pl-3">
                      {children.map((f) => (
                        <FileItem
                          key={f}
                          path={f}
                          selected={selectedFile === f}
                          onClick={() => openFile(f)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor + terminal */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* File tab */}
          {selectedFile && (
            <div className="border-b border-zinc-800 px-4 py-1.5 flex items-center gap-2 text-xs bg-zinc-900/30 shrink-0">
              <span className="text-zinc-300">{selectedFile.split("/").pop()}</span>
              <span className="text-zinc-600 text-[10px]">{selectedFile}</span>
            </div>
          )}

          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden relative">
            {!selectedFile && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                Select a file to start editing
              </div>
            )}
            {loadingFile && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10 text-zinc-400 text-sm">
                Loading...
              </div>
            )}
            {selectedFile && (
              <MonacoEditor
                height="100%"
                language={getLanguage(selectedFile)}
                value={fileContent}
                onChange={(val) => setFileContent(val || "")}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  renderLineHighlight: "all",
                  automaticLayout: true,
                }}
              />
            )}
          </div>

          {/* Terminal */}
          <div className="h-48 border-t border-zinc-800 bg-zinc-900/60 flex flex-col shrink-0">
            <div className="px-3 py-1 border-b border-zinc-800 flex items-center gap-3 text-xs">
              <span className="text-zinc-400 font-medium">Terminal</span>
              <span className="text-zinc-600">E2B Cloud Sandbox</span>
              {terminalError && (
                <span className="text-amber-400 animate-pulse">⚠ Error detected — Sage notified</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-zinc-300">
              {terminalLines.map((line, i) => (
                <div key={i} className={/error|exception/i.test(line) ? "text-red-400" : ""}>
                  {line}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            <div className="border-t border-zinc-800 px-3 py-2 flex items-center gap-2">
              <span className="text-zinc-500 font-mono text-xs">$</span>
              <input
                className="flex-1 bg-transparent text-xs font-mono text-zinc-200 outline-none placeholder-zinc-700"
                placeholder="python test.py"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTerminalCommand()}
              />
            </div>
          </div>
        </div>

        {/* Sage chat panel */}
        <div className="w-72 shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-900/20">
          <div className="border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <div>
              <div className="text-sm font-medium text-white">Sage</div>
              <div className="text-xs text-zinc-500">Socratic Mentor</div>
            </div>
          </div>

          {issueData && (
            <div className="border-b border-zinc-800 px-4 py-3 bg-zinc-900/40">
              <div className="text-xs text-zinc-500 mb-1">Current Issue</div>
              <div className="text-xs text-zinc-300 line-clamp-2">{issueData.title}</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sageMessages.length === 0 && (
              <div className="text-xs text-zinc-600 text-center py-4">
                Ask Sage anything about the code. Hint: Sage will guide you with questions, not answers.
              </div>
            )}
            {sageMessages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-200"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span className="block text-emerald-400 text-[10px] font-medium mb-1">💡 Sage</span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {sageLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-400">
                  <span className="animate-pulse">Sage is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-zinc-800 p-3 shrink-0">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Ask Sage..."
                value={sageInput}
                onChange={(e) => setSageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sageLoading && sendToSage()}
                disabled={sageLoading}
              />
              <button
                onClick={() => sendToSage()}
                disabled={sageLoading || !sageInput.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors"
              >
                →
              </button>
            </div>
            <div className="text-[10px] text-zinc-700 mt-1.5 text-center">
              Sage never writes code for you
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileItem({
  path,
  selected,
  onClick,
}: {
  path: string;
  selected: boolean;
  onClick: () => void;
}) {
  const name = path.split("/").pop() || path;
  const ext = name.split(".").pop() || "";
  const iconMap: Record<string, string> = {
    ts: "🔷", tsx: "🔷", js: "🟨", jsx: "🟨", py: "🐍",
    rs: "🦀", go: "🐹", java: "☕", md: "📄", json: "📋",
    css: "🎨", html: "🌐", sh: "⚙", test: "🧪",
  };
  const icon = name.includes(".test.") || name.includes(".spec.") ? "🧪" : (iconMap[ext] || "📄");

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1 flex items-center gap-1.5 hover:bg-zinc-800 transition-colors truncate ${
        selected ? "bg-zinc-800 text-white" : "text-zinc-400"
      }`}
    >
      <span className="text-[10px]">{icon}</span>
      <span className="truncate">{name}</span>
    </button>
  );
}

// Simulated E2B execution — in production, call E2B API with WebSocket streaming
async function simulateE2B(cmd: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

  if (cmd.startsWith("python") && cmd.includes("test")) {
    return `collecting ... collected 4 items
PASSED test_valid_login
PASSED test_logout
FAILED test_null_username — TypeError: NoneType has no attribute 'strip'
  File "auth.py", line 10, in authenticate
    username.strip()
TypeError: 'NoneType' object has no attribute 'strip'
1 failed, 3 passed in 0.42s`;
  }
  if (cmd.startsWith("python")) {
    return `Python 3.11.0
>>> Ready`;
  }
  if (cmd === "ls" || cmd === "ls -la") {
    return `total 24\ndrwxr-xr-x  auth.py\ndrwxr-xr-x  models.py\ndrwxr-xr-x  tests/\ndrwxr-xr-x  README.md`;
  }
  if (cmd.startsWith("npm") || cmd.startsWith("node")) {
    return `> Executing in E2B sandbox...\nDone in 1.2s`;
  }
  if (cmd === "help") {
    return `Available: python, node, npm, ls, cat, echo\nRunning in E2B cloud sandbox`;
  }
  return `${cmd}: command executed in E2B sandbox`;
}
