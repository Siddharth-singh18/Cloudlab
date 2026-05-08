// frontend/src/pages/CodeReview.jsx
import { useEffect, useState, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Peer } from 'peerjs';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');

export default function CodeReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ lineNumber: 1, text: '' });
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'chat' | 'ai' | 'voice'
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const chatEndRef = useRef(null);

  // Phase 4: WebRTC Voice Chat state
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle | hosting | joining | connected
  const [peerId, setPeerId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const currentCallRef = useRef(null);

  const editorRef = useRef(null);
  const handleEditorMount = (editor) => { editorRef.current = editor; };

  useEffect(() => {
    axios.get(`/api/reviews/${id}`).then(({ data }) => {
      setReview(data);
      setComments(data.comments);
    });
    socket.emit('join-review', id);
    socket.on('new-comment', (comment) => setComments(prev => [...prev, comment]));
    socket.on('status-changed', (status) => setReview(prev => ({ ...prev, status })));
    socket.on('code-updated', (modifiedCode) => setReview(prev => ({ ...prev, modifiedCode })));
    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      setActiveTab(tab => {
        if (tab !== 'chat') setUnreadChat(n => n + 1);
        return tab;
      });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    return () => {
      socket.off('new-comment');
      socket.off('status-changed');
      socket.off('code-updated');
      socket.off('chat-message');
      // Cleanup voice
      if (peerRef.current) peerRef.current.destroy();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [id]);

  const submitComment = async () => {
    if (!newComment.text.trim()) return;
    const { data } = await axios.post(`/api/reviews/${id}/comments`, newComment);
    socket.emit('add-comment', { reviewId: id, comment: data });
    setNewComment({ lineNumber: 1, text: '' });
  };

  const updateStatus = async (status) => {
    try {
      await axios.patch(`/api/reviews/${id}/status`, { status });
      socket.emit('update-status', { reviewId: id, status });
      setReview(prev => ({ ...prev, status }));
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const saveCode = async () => {
    if (!editorRef.current) return;
    const modifiedCode = editorRef.current.getModifiedEditor().getValue();
    try {
      await axios.patch(`/api/reviews/${id}/code`, { modifiedCode });
      socket.emit('update-code', { reviewId: id, modifiedCode });
      setReview(prev => ({ ...prev, modifiedCode }));
      alert('Code saved!');
    } catch (err) { alert('Error saving code'); }
  };

  const runCode = async () => {
    setRunning(true);
    setOutput('⏳ Running code...');
    try {
      const codeToRun = editorRef.current
        ? editorRef.current.getModifiedEditor().getValue()
        : (review.modifiedCode || review.code);
      const { data } = await axios.post(`/api/execute`, { code: codeToRun, language: review.language });
      setOutput(data.output);
    } catch (err) {
      setOutput('❌ Error: ' + (err.response?.data?.error || err.message));
    }
    setRunning(false);
  };

  const runAiReview = async () => {
    setAiLoading(true);
    setActiveTab('ai');
    try {
      const { data } = await axios.post(`/api/reviews/${id}/ai-review`);
      // New response format: { comments, summary }
      const newComments = data.comments || data;
      const summary = data.summary || '';
      newComments.forEach(c => socket.emit('add-comment', { reviewId: id, comment: c }));
      setComments(prev => [...prev, ...newComments]);
      setAiSummary(summary);
    } catch (err) {
      setAiSummary('❌ Error generating AI review: ' + (err.response?.data?.message || err.message));
    }
    setAiLoading(false);
  };

  // ── Phase 4: WebRTC Voice Chat ──────────────────────────
  const getMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  };

  const startVoiceHost = async () => {
    try {
      const stream = await getMic();
      const peer = new Peer();
      peerRef.current = peer;
      peer.on('open', (pid) => {
        setPeerId(pid);
        setVoiceStatus('hosting');
      });
      peer.on('call', (call) => {
        call.answer(stream);
        currentCallRef.current = call;
        call.on('stream', (remoteStream) => {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play();
          setVoiceStatus('connected');
        });
      });
    } catch (err) {
      alert('Mic access denied. Please allow microphone permission.');
    }
  };

  const joinVoiceCall = async () => {
    if (!joinId.trim()) return alert('Please enter the Host ID first.');
    try {
      const stream = await getMic();
      const peer = new Peer();
      peerRef.current = peer;
      peer.on('open', () => {
        const call = peer.call(joinId.trim(), stream);
        currentCallRef.current = call;
        call.on('stream', (remoteStream) => {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play();
          setVoiceStatus('connected');
        });
        setVoiceStatus('joining');
      });
    } catch (err) {
      alert('Mic access denied. Please allow microphone permission.');
    }
  };

  const endVoiceCall = () => {
    if (currentCallRef.current) currentCallRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    peerRef.current = null;
    localStreamRef.current = null;
    setVoiceStatus('idle');
    setPeerId('');
    setJoinId('');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };
  // ─────────────────────────────────────────────────────────

  // ── Real-time Text Chat ──────────────────────────────────
  const sendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      text: chatInput.trim(),
      sender: user?.name || 'You',
      role: user?.role,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    // Add locally immediately
    setChatMessages(prev => [...prev, msg]);
    // Broadcast to room (without isMe flag)
    socket.emit('chat-message', { reviewId: id, message: { ...msg, isMe: false } });
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  // ─────────────────────────────────────────────────────────

  if (!review) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-400">Loading review...</p>
      </div>
    </div>
  );

  const groupedComments = comments.reduce((acc, c) => {
    if (!acc[c.lineNumber]) acc[c.lineNumber] = [];
    acc[c.lineNumber].push(c);
    return acc;
  }, {});

  const statusColor = review.status === 'approved' ? 'bg-green-600'
    : review.status === 'changes_requested' ? 'bg-red-600'
    : review.status === 'merged' ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">

      {/* ── Left: Editor Column ── */}
      <div className="w-2/3 border-r border-gray-700 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          {/* Left actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm">
              ← Back
            </button>
            <h2 className="text-base font-semibold truncate max-w-[180px]">{review.title}</h2>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor}`}>
              {review.status.replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-gray-700 text-gray-300">{review.language}</span>

            <button
              onClick={runCode} disabled={running}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1"
            >
              {running ? '⏳' : '▶'} {running ? 'Running…' : 'Run Code'}
            </button>

            {(user?.role === 'reviewer' || user?.role === 'admin') && (
              <button
                onClick={runAiReview} disabled={aiLoading}
                className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1 shadow-lg shadow-purple-700/30"
              >
                {aiLoading ? '⏳' : '✨'} {aiLoading ? 'Analysing…' : 'AI Review'}
              </button>
            )}
          </div>

          {/* Right actions */}
          <div className="flex gap-2 items-center">
            {(user?.role === 'reviewer' || user?.role === 'admin') ? (
              <>
                <button onClick={saveCode} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm font-medium transition">Save</button>
                <button onClick={() => updateStatus('approved')} className="bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded text-sm font-medium transition">Approve</button>
                <button onClick={() => updateStatus('changes_requested')} className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded text-sm font-medium transition">Request Changes</button>
              </>
            ) : user?.role === 'developer' && review.modifiedCode && review.modifiedCode !== review.code ? (
              <button
                onClick={async () => {
                  await axios.patch(`/api/reviews/${id}/code`, { modifiedCode: review.modifiedCode, code: review.modifiedCode });
                  await axios.patch(`/api/reviews/${id}/status`, { status: 'merged' });
                  setReview(prev => ({ ...prev, code: review.modifiedCode, status: 'merged' }));
                  socket.emit('update-status', { reviewId: id, status: 'merged' });
                }}
                className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-sm font-medium transition"
              >
                ✓ Accept & Merge
              </button>
            ) : null}
          </div>
        </div>

        {/* Monaco Diff Editor */}
        <div className="flex-1 min-h-0">
          <DiffEditor
            height="100%"
            language={review.language}
            original={review.code}
            modified={review.modifiedCode || review.code}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              readOnly: user?.role === 'developer',
              originalEditable: false,
              lineNumbers: 'on',
              minimap: { enabled: false },
              renderSideBySide: true,
              fontSize: 13,
            }}
          />
        </div>

        {/* Terminal Output Panel */}
        <div className="h-40 shrink-0 border-t border-gray-700 bg-[#0d1117] flex flex-col">
          <div className="px-4 py-1.5 border-b border-gray-800 flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Terminal Output
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">{output || 'No output yet. Click "Run Code" to execute.'}</pre>
          </div>
        </div>
      </div>

      {/* ── Right: Sidebar ── */}
      <div className="w-1/3 flex flex-col min-w-0">

        {/* Tabs */}
        <div className="flex border-b border-gray-700 shrink-0">
          {[
            { key: 'comments', label: '📝 Comments' },
            { key: 'chat',     label: unreadChat > 0 ? `💬 Chat (${unreadChat})` : '💬 Chat' },
            { key: 'ai',       label: '✨ AI Insights' },
            { key: 'voice',    label: '🎧 Voice' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key === 'chat') setUnreadChat(0); }}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition whitespace-nowrap px-1 ${
                activeTab === key
                  ? 'border-b-2 border-blue-400 text-blue-400 bg-gray-800'
                  : unreadChat > 0 && key === 'chat'
                  ? 'text-yellow-400 animate-pulse'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Comments ── */}
        {activeTab === 'comments' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Object.keys(groupedComments).length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8">No comments yet.</p>
              ) : Object.entries(groupedComments).sort(([a], [b]) => Number(a) - Number(b)).map(([line, lineComments]) => (
                <div key={line} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-[11px] font-bold text-blue-400 mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                    Line {line}
                  </div>
                  <div className="space-y-2">
                    {lineComments.map((c, i) => (
                      <div key={i} className={`rounded p-2 ${c.author?.name?.includes('Gemini') ? 'bg-purple-900/40 border border-purple-700/40' : 'bg-gray-900'}`}>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span className="font-medium text-gray-200">{c.author?.name}</span>
                          <span>{new Date(c.createdAt || Date.now()).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-100 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700 space-y-2 shrink-0">
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Line #"
                  value={newComment.lineNumber}
                  onChange={e => setNewComment(p => ({ ...p, lineNumber: +e.target.value }))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-500 text-sm self-center">Line number</span>
              </div>
              <textarea
                placeholder="Write a comment..."
                value={newComment.text}
                onChange={e => setNewComment(p => ({ ...p, text: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm h-16 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                onClick={submitComment}
                className="w-full bg-blue-600 hover:bg-blue-500 rounded py-2 text-sm font-medium transition"
              >
                Add Comment
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Chat ── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-8">
                  <span className="text-4xl">💬</span>
                  <p className="text-gray-500 text-sm">No messages yet.<br/>Start chatting with your collaborators!</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      msg.isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                    }`}>
                      {!msg.isMe && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[10px] font-semibold text-blue-300">{msg.sender}</span>
                          <span className={`text-[9px] px-1 rounded ${
                            msg.role === 'admin' ? 'bg-red-700/50 text-red-300' :
                            msg.role === 'reviewer' ? 'bg-green-700/50 text-green-300' :
                            'bg-gray-600 text-gray-400'
                          }`}>{msg.role}</span>
                        </div>
                      )}
                      <p className="text-sm leading-snug">{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 ${msg.isMe ? 'text-blue-200' : 'text-gray-500'} text-right`}>{msg.time}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-gray-700 shrink-0">
              <form onSubmit={sendChat} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-3 py-2 rounded-xl text-sm font-medium transition"
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Tab: AI Insights ── */}
        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">Gemini is analysing your code…</p>
              </div>
            ) : aiSummary ? (
              <>
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-600/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-sm font-bold text-purple-300">Gemini AI Summary</h3>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">{aiSummary}</p>
                </div>

                {/* AI Comments */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line-by-Line Issues</h4>
                  {comments.filter(c => c.author?.name?.includes('Gemini')).map((c, i) => (
                    <div key={i} className="bg-gray-800 border border-purple-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs bg-purple-700 text-purple-100 px-1.5 py-0.5 rounded font-mono">Line {c.lineNumber}</span>
                        <span className="text-[10px] text-gray-500">{new Date(c.createdAt || Date.now()).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-100 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <span className="text-5xl">✨</span>
                <p className="text-gray-400 text-sm">Click <strong className="text-purple-400">AI Review</strong> in the toolbar to get Gemini's analysis of this code.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Voice Chat (Phase 4: WebRTC) ── */}
        {activeTab === 'voice' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <audio ref={remoteAudioRef} autoPlay />

            {voiceStatus === 'idle' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <span className="text-4xl block mb-2">🎧</span>
                  <h3 className="font-semibold mb-1">Live Voice Collaboration</h3>
                  <p className="text-gray-400 text-xs">Talk while reviewing code in real-time — no external app needed.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold">START A SESSION</p>
                  <button
                    onClick={startVoiceHost}
                    className="w-full bg-green-700 hover:bg-green-600 rounded-lg py-3 text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    🎙️ Host Voice Room
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold">JOIN A SESSION</p>
                  <input
                    value={joinId}
                    onChange={e => setJoinId(e.target.value)}
                    placeholder="Paste Host ID here..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={joinVoiceCall}
                    className="w-full bg-blue-700 hover:bg-blue-600 rounded-lg py-3 text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    📞 Join Voice Room
                  </button>
                </div>
              </div>
            )}

            {voiceStatus === 'hosting' && (
              <div className="space-y-4">
                <div className="bg-green-900/40 border border-green-600/50 rounded-xl p-4 text-center">
                  <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse mx-auto mb-2"></div>
                  <p className="text-green-300 font-semibold text-sm mb-1">Room is LIVE — Waiting for others…</p>
                  <p className="text-gray-400 text-xs mb-3">Share this ID with the other person</p>
                  <div className="bg-gray-900 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
                    <code className="text-green-400 text-xs font-mono break-all">{peerId}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(peerId); alert('ID Copied!'); }}
                      className="text-gray-400 hover:text-white text-xs shrink-0 bg-gray-700 px-2 py-1 rounded"
                    >Copy</button>
                  </div>
                </div>
                <button onClick={endVoiceCall} className="w-full bg-red-700 hover:bg-red-600 rounded-lg py-2 text-sm font-medium transition">
                  ✕ End Session
                </button>
              </div>
            )}

            {voiceStatus === 'joining' && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-300 text-sm">Connecting to host…</p>
              </div>
            )}

            {voiceStatus === 'connected' && (
              <div className="space-y-4">
                <div className="bg-blue-900/40 border border-blue-600/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
                    <p className="text-blue-300 font-semibold text-sm">🎧 Connected — Voice Active</p>
                  </div>
                  <p className="text-gray-400 text-xs">You are live with another collaborator</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={toggleMute}
                    className={`rounded-lg py-3 text-sm font-medium transition ${isMuted ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                  </button>
                  <button onClick={endVoiceCall} className="bg-red-700 hover:bg-red-600 rounded-lg py-3 text-sm font-medium transition">
                    📵 End Call
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}