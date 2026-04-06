"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SageMessage } from "../../../lib/agents/sage";
import AgentPermissionsPanel from "../../components/AgentPermissionsPanel";
import MentorMessageContent from "../../components/MentorMessageContent";

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

  const [mentorTab, setMentorTab] = useState<"sage" | "solution">("sage");
  const [solutionOptIn, setSolutionOptIn] = useState(false);
  const [solutionAckCheckbox, setSolutionAckCheckbox] = useState(false);
  const [solutionMessages, setSolutionMessages] = useState<SageMessage[]>([]);
  const [solutionInput, setSolutionInput] = useState("");
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [patchModal, setPatchModal] = useState<string | null>(null);

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
  }, [sageMessages, solutionMessages, mentorTab]);

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

  async function sendToSolution() {
    const input = solutionInput.trim();
    if (!input || !solutionOptIn) return;

    const userMsg: SageMessage = { role: "user", content: input };
    const newMessages = [...solutionMessages, userMsg];
    setSolutionMessages(newMessages);
    setSolutionInput("");
    setSolutionLoading(true);

    try {
      const res = await fetch("/api/agents/solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            fileName: selectedFile || undefined,
            fileContent: fileContent ? fileContent.slice(0, 8000) : undefined,
            issueTitle: issueData?.title,
            issueBody: issueData?.body?.slice(0, 8000),
          },
          acknowledgedElevated: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Solution failed");
      setSolutionMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || "No response." },
      ]);
    } catch {
      setSolutionMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Solution agent failed to respond. Check PERPLEXITY_API_KEY and try again.",
        },
      ]);
    } finally {
      setSolutionLoading(false);
    }
  }

  async function generatePatchFile() {
    if (!solutionOptIn || solutionMessages.length === 0) return;
    setSolutionLoading(true);
    try {
      const res = await fetch("/api/agents/solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...solutionMessages,
            {
              role: "user",
              content:
                "Output only a unified diff (git apply format) or clearly separated per-file code blocks with paths. Minimize prose outside code/diff.",
            },
          ],
          context: {
            fileName: selectedFile || undefined,
            fileContent: fileContent ? fileContent.slice(0, 8000) : undefined,
            issueTitle: issueData?.title,
            issueBody: issueData?.body?.slice(0, 8000),
          },
          patchOnly: true,
          acknowledgedElevated: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Patch failed");
      setPatchModal(data.reply || "");
    } catch {
      setPatchModal("Could not generate a patch. Try again after a shorter conversation.");
    } finally {
      setSolutionLoading(false);
    }
  }

  function openGitHubCompare() {
    window.open(`https://github.com/${repoFullName}/compare`, "_blank", "noopener,noreferrer");
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
          <AgentPermissionsPanel />
          <span className="bg-violet-500/20 text-violet-400 px-2 py-1 rounded">Forge</span>
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Sage</span>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded">E2B</span>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
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

        {/* Sage + Solution mentor panel */}
        <div className="w-[22rem] min-w-[18rem] max-w-[min(100vw,22rem)] shrink-0 h-full min-h-0 border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-900/20">
          <div className="flex border-b border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setMentorTab("sage")}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                mentorTab === "sage"
                  ? "bg-zinc-800/80 text-white border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sage
            </button>
            <button
              type="button"
              onClick={() => setMentorTab("solution")}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                mentorTab === "solution"
                  ? "bg-zinc-800/80 text-white border-b-2 border-orange-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Solution β
            </button>
          </div>

          {mentorTab === "sage" ? (
            <div className="border-b border-zinc-800 px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  S
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Sage</div>
                  <div className="text-xs text-zinc-500">Socratic Mentor · Perplexity Sonar</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[10px] text-rose-400 font-medium">Sage will never write code for you</span>
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">
                Ask questions — Sage responds with guiding questions only
              </div>
            </div>
          ) : (
            <div className="border-b border-zinc-800 px-4 py-2.5 shrink-0 bg-orange-950/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Solution agent (beta)</div>
                  <div className="text-xs text-orange-400/90">Concrete fixes · not Socratic Sage</div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                Elevated workflow: may propose code and diffs. Review everything before{" "}
                <span className="text-zinc-400">git push</span> or PR. No silent commits from OpenStep.
              </p>
            </div>
          )}

          {issueData && (
            <div className="border-b border-zinc-800 px-4 py-3 bg-zinc-900/40">
              <div className="text-xs text-zinc-500 mb-1">Current Issue</div>
              <div className="text-xs text-zinc-300 line-clamp-2">{issueData.title}</div>
            </div>
          )}

          {mentorTab === "sage" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {sageMessages.length === 0 && (
                  <div className="text-xs text-zinc-600 text-center py-4">
                    Ask Sage anything about the code. Hint: Sage will guide you with questions, not answers.
                  </div>
                )}
                {sageMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex w-full min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`min-w-0 max-w-full px-3 py-2.5 rounded-xl leading-relaxed overflow-hidden ${
                        msg.role === "user" ? "max-w-[92%] " : "w-full "
                      }${
                        msg.role === "user"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-emerald-900/30 border border-emerald-500/20 text-zinc-200 rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-emerald-400 text-[10px] font-medium">💡 Sage asks:</span>
                        </div>
                      )}
                      <MentorMessageContent
                        content={msg.content}
                        variant={msg.role === "user" ? "user" : "sage"}
                      />
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
                    type="button"
                    onClick={() => sendToSage()}
                    disabled={sageLoading || !sageInput.trim()}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                  >
                    →
                  </button>
                </div>
                <div className="text-[10px] text-zinc-700 mt-1.5 text-center">Sage never writes code for you</div>
              </div>
            </>
          ) : !solutionOptIn ? (
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                Before using Solution agent, confirm you understand it is <strong className="text-zinc-200">not</strong>{" "}
                credential-isolated Socratic Sage: it may output patches and implementation steps for you to review and
                apply locally.
              </p>
              <label className="flex items-start gap-2 text-[11px] text-zinc-500 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={solutionAckCheckbox}
                  onChange={(e) => setSolutionAckCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-600"
                />
                <span>
                  I understand this mode proposes concrete code and diffs; I will review before any commit or PR, and
                  OpenStep will not push to GitHub without my action on GitHub.
                </span>
              </label>
              <button
                type="button"
                disabled={!solutionAckCheckbox}
                onClick={() => setSolutionOptIn(true)}
                className="w-full py-2 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                Enable Solution agent
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {solutionMessages.length === 0 && (
                  <div className="text-xs text-zinc-600 text-center py-4">
                    Describe the fix you want. Solution agent may respond with explanation and code.
                  </div>
                )}
                {solutionMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex w-full min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`min-w-0 max-w-full px-3 py-2.5 rounded-xl leading-relaxed overflow-hidden ${
                        msg.role === "user" ? "max-w-[92%] " : "w-full "
                      }${
                        msg.role === "user"
                          ? "bg-orange-700 text-white rounded-br-sm"
                          : "bg-orange-950/40 border border-orange-500/25 text-zinc-200 rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-orange-400 text-[10px] font-medium">⚡ Solution:</span>
                        </div>
                      )}
                      <MentorMessageContent
                        content={msg.content}
                        variant={msg.role === "user" ? "user" : "solution"}
                      />
                    </div>
                  </div>
                ))}
                {solutionLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-400">
                      <span className="animate-pulse">Solution agent is working...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {solutionMessages.length > 0 &&
                solutionMessages[solutionMessages.length - 1]?.role === "assistant" &&
                !solutionLoading && (
                  <div className="px-3 py-2 flex flex-col gap-1.5 shrink-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md z-10">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => generatePatchFile()}
                        className="flex-1 text-[10px] py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-300 border border-orange-500/30 font-medium"
                      >
                        Generate patch
                      </button>
                      <button
                        type="button"
                        onClick={() => openGitHubCompare()}
                        className="flex-1 text-[10px] py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 font-medium"
                      >
                        Open PR on GitHub
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500 text-center leading-snug">
                      Apply locally, push a branch, then use GitHub compare — no auto-commit from this app.
                    </p>
                  </div>
                )}

              <div className="border-t border-zinc-800 p-3 shrink-0">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Ask for a concrete fix..."
                    value={solutionInput}
                    onChange={(e) => setSolutionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !solutionLoading && sendToSolution()}
                    disabled={solutionLoading}
                  />
                  <button
                    type="button"
                    onClick={() => sendToSolution()}
                    disabled={solutionLoading || !solutionInput.trim()}
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {patchModal !== null && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            onClick={(e) => e.target === e.currentTarget && setPatchModal(null)}
          >
            <div className="bg-zinc-950 border border-orange-500/30 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-sm font-medium text-white">Generated patch</span>
                <button
                  type="button"
                  onClick={() => setPatchModal(null)}
                  className="text-zinc-500 hover:text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap">
                {patchModal}
              </pre>
              <div className="flex gap-2 p-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(patchModal);
                  }}
                  className="flex-1 py-2 rounded-lg text-xs bg-orange-600 hover:bg-orange-500 text-white"
                >
                  Copy to clipboard
                </button>
                <button
                  type="button"
                  onClick={() => setPatchModal(null)}
                  className="px-4 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
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
