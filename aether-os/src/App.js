import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const generateId = () => Math.random().toString(36).substring(2, 10);

const TOOL_LABELS = {
  rag_tool: { icon: "📄", label: "PDF RAG" },
  duckduckgo_search: { icon: "🔍", label: "Web Search" },
  web_search: { icon: "🔍", label: "Web Search" },
  add_expense: { icon: "💰", label: "Expense Tracker" },
  list_expenses: { icon: "💰", label: "Expense Tracker" },
  summarize: { icon: "💰", label: "Expense Summary" },
};

export default function App() {
  const [threadId, setThreadId] = useState(generateId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [hoveredThread, setHoveredThread] = useState(null);

  const fileInputRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`${API}/threads`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (e) { }
  };

  const newChat = async () => {
    const newId = generateId();
    setThreadId(newId);
    setMessages([]);
    setUploadedFile(null);
    await fetchThreads();
  };

  const switchThread = async (id) => {
    setThreadId(id);
    setUploadedFile(null);

    try {
      const res = await fetch(`${API}/history/${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      setMessages([]);
    }
  };

  const deleteThread = async (e, id) => {
    e.stopPropagation();

    try {
      await fetch(`${API}/threads/${id}`, {
        method: "DELETE",
      });

      if (id === threadId) {
        setMessages([]);
        setThreadId(generateId());
      }

      await fetchThreads();
    } catch (e) { }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          thread_id: threadId,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          tools_used: data.tools_used || [],
        },
      ]);

      fetchThreads();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Could not reach API.",
          tools_used: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const uploadPdf = async (file) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${API}/upload-pdf?thread_id=${threadId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      setUploadedFile(data.filename);
    } catch (e) {
      alert("PDF upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.8; }
          97% { opacity: 1; }
          98% { opacity: 0.9; }
        }

        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: #041822;
        }

        ::-webkit-scrollbar-thumb {
          background: #00bcd466;
          border-radius: 4px;
        }

        textarea:focus {
          border-color: #00bcd4 !important;
          box-shadow: 0 0 12px #00bcd444 !important;
        }
      `}</style>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoText}>AETHER OS</span>
          <span style={styles.logoSub}>
            ▸ OCEAN CORE v3.0
          </span>
        </div>

        <button
          style={styles.newChatBtn}
          onClick={newChat}
        >
          ⚡ NEW SESSION
        </button>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            ◈ ACTIVE THREADS
          </div>

          <div style={styles.threadList}>
            {threads.length === 0 && (
              <div style={styles.noThreads}>
                — NO SESSIONS —
              </div>
            )}

            {threads.map((t) => (
              <div
                key={t.id}
                style={{
                  ...styles.threadItem,
                  ...(t.id === threadId
                    ? styles.threadItemActive
                    : {}),
                }}
                onClick={() => switchThread(t.id)}
                onMouseEnter={() =>
                  setHoveredThread(t.id)
                }
                onMouseLeave={() =>
                  setHoveredThread(null)
                }
              >
                <span style={styles.threadName}>
                  ▸ {t.name}
                </span>

                {hoveredThread === t.id && (
                  <span
                    style={styles.deleteBtn}
                    onClick={(e) =>
                      deleteThread(e, t.id)
                    }
                  >
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            ◈ NEURAL TOOLS
          </div>

          <div style={styles.toolCard}>
            🔍 WEB SCRAPER
          </div>

          <div style={styles.toolCard}>
            📄 PDF MATRIX
          </div>

          <div style={styles.toolCard}>
            🛠 MCP BRIDGE
          </div>

          <div style={styles.toolCard}>
            ⚡ CRAG ENGINE
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            ◈ DATA INJECT
          </div>

          <button
            style={styles.uploadBtn}
            onClick={() =>
              fileInputRef.current.click()
            }
            disabled={uploading}
          >
            {uploading
              ? "INJECTING..."
              : "💉 INJECT PDF"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) {
                uploadPdf(e.target.files[0]);
              }
            }}
          />

          {uploadedFile && (
            <div style={styles.fileChip}>
              ◈ {uploadedFile}
            </div>
          )}
        </div>

        <div style={styles.threadBox}>
          <div style={styles.sectionTitle}>
            ◈ SESSION ID
          </div>

          <div style={styles.threadId}>
            {threadId}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>
            AETHER OS // OCEAN INTERFACE
          </span>

          <span style={styles.headerSub}>
            ▸ ALL SYSTEMS ONLINE ◈
            AQUA MODE ACTIVE
          </span>
        </div>

        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                ◈
              </div>

              <div style={styles.emptyText}>
                AWAITING INPUT...
              </div>

              <div style={styles.emptySubText}>
                Ocean neural interface ready.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={styles.msgWrapper}>
              <div
                style={
                  msg.role === "user"
                    ? styles.userMsg
                    : styles.assistantMsg
                }
              >
                <span style={styles.msgIcon}>
                  {msg.role === "user"
                    ? "▸"
                    : "◈"}
                </span>

                <div>
                  <div
                    style={
                      msg.role === "user"
                        ? styles.msgLabel
                        : styles.msgLabelAI
                    }
                  >
                    {msg.role === "user"
                      ? "USER"
                      : "AETHER"}
                  </div>

                  <span style={styles.msgContent}>
                    {msg.content}
                  </span>
                </div>
              </div>

              {msg.role === "assistant" &&
                msg.tools_used &&
                msg.tools_used.length > 0 && (
                  <div style={styles.toolBadges}>
                    {msg.tools_used.map(
                      (tool, j) => {
                        const t =
                          TOOL_LABELS[tool] || {
                            icon: "🔧",
                            label: tool,
                          };

                        return (
                          <span
                            key={j}
                            style={styles.toolBadge}
                          >
                            {t.icon}{" "}
                            {t.label.toUpperCase()}
                          </span>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
          ))}

          {loading && (
            <div style={styles.assistantMsg}>
              <span style={styles.msgIcon}>
                ◈
              </span>

              <div>
                <div style={styles.msgLabelAI}>
                  AETHER
                </div>

                <span style={styles.typing}>
                  <span
                    style={{
                      ...styles.dot,
                      animation:
                        "blink 1s infinite 0s",
                    }}
                  >
                    █
                  </span>

                  <span
                    style={{
                      ...styles.dot,
                      animation:
                        "blink 1s infinite 0.2s",
                    }}
                  >
                    █
                  </span>

                  <span
                    style={{
                      ...styles.dot,
                      animation:
                        "blink 1s infinite 0.4s",
                    }}
                  >
                    █
                  </span>
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div style={styles.inputArea}>
          <div style={styles.inputPrefix}>
            &gt;_
          </div>

          <textarea
            style={styles.input}
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="ENTER COMMAND..."
            rows={1}
          />

          <button
            style={{
              ...styles.sendBtn,
              opacity:
                loading || !input.trim()
                  ? 0.4
                  : 1,
            }}
            onClick={sendMessage}
            disabled={
              loading || !input.trim()
            }
          >
            ⚡
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#041822",
    color: "#4dd0e1",
    fontFamily: "'Courier New', monospace",
  },

  sidebar: {
    width: "260px",
    background:
      "linear-gradient(180deg, #062838 0%, #041822 100%)",
    borderRight: "1px solid #00bcd444",
    display: "flex",
    flexDirection: "column",
    padding: "20px 16px",
    gap: "20px",
    overflowY: "auto",
    boxShadow: "4px 0 20px #00bcd422",
  },

  logo: {
    display: "flex",
    flexDirection: "column",
  },

  logoText: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#7fe7ff",
    textShadow:
      "0 0 10px #00bcd4, 0 0 20px #00bcd4",
    letterSpacing: "4px",
  },

  logoSub: {
    fontSize: "10px",
    color: "#7fe7ff88",
    marginTop: "4px",
    letterSpacing: "2px",
  },

  newChatBtn: {
    background:
      "linear-gradient(135deg, #0b3b53 0%, #0f4c75 100%)",
    color: "#7fe7ff",
    border: "1px solid #00bcd4",
    borderRadius: "4px",
    padding: "10px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "12px",
    letterSpacing: "2px",
    fontFamily: "'Courier New', monospace",
    boxShadow: "0 0 10px #00bcd444",
    transition: "all 0.2s",
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  sectionTitle: {
    fontSize: "10px",
    color: "#7fe7ff88",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  threadList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "200px",
    overflowY: "auto",
  },

  threadItem: {
    backgroundColor: "#0b3b53",
    borderRadius: "4px",
    padding: "7px 10px",
    fontSize: "11px",
    cursor: "pointer",
    border: "1px solid #00bcd433",
    color: "#7fe7ffaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    letterSpacing: "1px",
  },

  threadItemActive: {
    border: "1px solid #00bcd4",
    color: "#7fe7ff",
    backgroundColor: "#0f4c75",
    boxShadow: "0 0 8px #00bcd444",
  },

  threadName: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },

  deleteBtn: {
    fontSize: "11px",
    marginLeft: "6px",
    cursor: "pointer",
    flexShrink: 0,
    color: "#7fe7ff88",
  },

  noThreads: {
    fontSize: "10px",
    color: "#7fe7ff33",
    letterSpacing: "2px",
  },

  toolCard: {
    backgroundColor: "#0b3b53",
    borderLeft: "2px solid #00bcd4",
    borderRadius: "4px",
    padding: "7px 10px",
    fontSize: "11px",
    color: "#7fe7ff",
    letterSpacing: "1px",
  },

  uploadBtn: {
    background:
      "linear-gradient(135deg, #0b3b53 0%, #0f4c75 100%)",
    color: "#7fe7ff",
    border: "1px solid #00bcd466",
    borderRadius: "4px",
    padding: "8px",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "1px",
  },

  fileChip: {
    backgroundColor: "#0b3b53",
    border: "1px solid #00bcd466",
    borderRadius: "4px",
    padding: "6px 10px",
    fontSize: "11px",
    color: "#7fe7ff",
    letterSpacing: "1px",
  },

  threadBox: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  threadId: {
    fontSize: "10px",
    color: "#7fe7ff44",
    wordBreak: "break-all",
    letterSpacing: "1px",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background:
      "linear-gradient(180deg, #041822 0%, #062838 100%)",
  },

  header: {
    padding: "16px 28px",
    borderBottom: "1px solid #00bcd433",
    display: "flex",
    flexDirection: "column",
    background:
      "linear-gradient(90deg, #062838 0%, #0b3b53 100%)",
    boxShadow: "0 2px 20px #00bcd411",
  },

  headerTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#7fe7ff",
    letterSpacing: "3px",
    textShadow: "0 0 10px #00bcd4",
  },

  headerSub: {
    fontSize: "10px",
    color: "#7fe7ff88",
    marginTop: "4px",
    letterSpacing: "2px",
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  emptyState: {
    margin: "auto",
    textAlign: "center",
    opacity: 0.7,
  },

  emptyIcon: {
    fontSize: "48px",
    color: "#7fe7ff",
    textShadow: "0 0 20px #00bcd4",
    marginBottom: "12px",
  },

  emptyText: {
    fontSize: "18px",
    color: "#7fe7ff",
    letterSpacing: "4px",
    textShadow: "0 0 10px #00bcd4",
  },

  emptySubText: {
    fontSize: "12px",
    color: "#7fe7ff66",
    marginTop: "8px",
    letterSpacing: "2px",
  },

  msgWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  userMsg: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    backgroundColor: "#082c3c",
    padding: "12px 16px",
    borderRadius: "4px",
    border: "1px solid #00bcd444",
    alignSelf: "flex-end",
    maxWidth: "75%",
    boxShadow: "0 0 10px #00bcd411",
  },

  assistantMsg: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    backgroundColor: "#0b3b53",
    padding: "12px 16px",
    borderRadius: "4px",
    border: "1px solid #4dd0e144",
    alignSelf: "flex-start",
    maxWidth: "75%",
    boxShadow: "0 0 10px #4dd0e111",
  },

  msgIcon: {
    fontSize: "16px",
    flexShrink: 0,
    color: "#7fe7ff",
    textShadow: "0 0 8px #00bcd4",
  },

  msgLabel: {
    fontSize: "9px",
    color: "#7fe7ff88",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  msgLabelAI: {
    fontSize: "9px",
    color: "#4dd0e1",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  msgContent: {
    fontSize: "13px",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    color: "#d9faff",
  },

  typing: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },

  dot: {
    fontSize: "14px",
    color: "#7fe7ff",
  },

  toolBadges: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    paddingLeft: "28px",
  },

  toolBadge: {
    backgroundColor: "#0f4c75",
    border: "1px solid #00bcd444",
    borderRadius: "2px",
    padding: "2px 8px",
    fontSize: "10px",
    color: "#7fe7ffaa",
    letterSpacing: "1px",
  },

  inputArea: {
    display: "flex",
    gap: "10px",
    padding: "16px 28px",
    borderTop: "1px solid #00bcd433",
    background:
      "linear-gradient(90deg, #062838 0%, #0b3b53 100%)",
    alignItems: "center",
  },

  inputPrefix: {
    color: "#7fe7ff",
    fontSize: "16px",
    fontWeight: "700",
    textShadow: "0 0 8px #00bcd4",
    flexShrink: 0,
  },

  input: {
    flex: 1,
    backgroundColor: "#041822",
    border: "1px solid #00bcd444",
    borderRadius: "4px",
    padding: "12px 16px",
    color: "#d9faff",
    fontSize: "13px",
    resize: "none",
    outline: "none",
    fontFamily: "'Courier New', monospace",
    caretColor: "#00bcd4",
  },

  sendBtn: {
    background:
      "linear-gradient(135deg, #0b3b53 0%, #0f4c75 100%)",
    color: "#7fe7ff",
    border: "1px solid #00bcd4",
    borderRadius: "4px",
    padding: "0 18px",
    fontSize: "20px",
    cursor: "pointer",
    fontWeight: "700",
    height: "46px",
    boxShadow: "0 0 10px #00bcd444",
  },
};
















































