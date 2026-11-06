import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  HeartPulse,
  MessageCircleHeart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { chatService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import RichText from '../../components/RichText';
import Avatar from '../../components/Avatar';
import ConfirmDialog from '../../components/ConfirmDialog';
import { InlineSpinner } from '../../components/Loader';
import { ErrorState } from '../../components/EmptyState';

const FALLBACK_SUGGESTIONS = [
  'How can I manage a mild fever at home?',
  'What are some healthy ways to improve my sleep?',
  'When should I seek urgent care for a headache?',
  'How can I support healthy blood pressure?',
  'What should I know about antibiotic use?',
];

const timeLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function HealthChat() {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const loadHistory = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await chatService.history();
      setMessages(data.data.messages);
      if (data.data.suggestions?.length) setSuggestions(data.data.suggestions);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, sending]);

  const send = async (text) => {
    const messageText = (text ?? input).trim();
    if (!messageText || sending) return;

    const optimistic = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((current) => [...current, optimistic]);
    setInput('');
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const { data } = await chatService.send(messageText);
      setMessages((current) => [
        ...current.filter((item) => item._id !== optimistic._id),
        data.data.userMessage,
        data.data.assistantMessage,
      ]);
    } catch (err) {
      setMessages((current) => current.filter((item) => item._id !== optimistic._id));
      setInput(messageText);
      toast.error('Message not sent', getApiError(err));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      await chatService.clear();
      setMessages([]);
      setClearOpen(false);
      toast.success('Conversation cleared', 'Your chat history has been removed.');
    } catch (err) {
      toast.error('Could not clear history', getApiError(err));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="chat-page page-stack">
      <PageHeader
        eyebrow="Always here, always careful"
        title="AI health assistant"
        subtitle="A calm space to understand symptoms, prepare for appointments and build healthier habits."
      />

      <div className="chat-layout">
        <section className="chat-shell card">
          <header className="chat-header">
            <div className="chat-ai-identity">
              <span className="chat-ai-avatar">
                <Sparkles size={20} />
                <span className="ai-online-dot" />
              </span>
              <div>
                <strong>MediCare AI</strong>
                <span><span className="live-dot" /> Online · general health guidance</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <span className="chat-safety-pill"><ShieldCheck size={13} /> Safety-first AI</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setClearOpen(true)}
                disabled={!messages.length}
                aria-label="Clear chat history"
                title="Clear conversation"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </header>

          <div className="chat-disclaimer">
            <ShieldCheck size={15} />
            <p>
              <strong>General information only.</strong> MediCare AI does not diagnose conditions or
              prescribe medication. For emergencies, contact local emergency services immediately.
            </p>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {loading ? (
              <div className="chat-loading"><InlineSpinner size={22} /> Loading your conversation…</div>
            ) : error ? (
              <ErrorState message={error} onRetry={loadHistory} />
            ) : !messages.length ? (
              <div className="chat-welcome">
                <span className="chat-welcome-icon">
                  <MessageCircleHeart size={30} />
                </span>
                <h2>Hello {user?.name?.split(' ')[0]}, how can I support you today?</h2>
                <p>
                  Ask about symptoms, medicines, prevention or healthy routines. I’ll share careful
                  general guidance and help you decide when to see a clinician.
                </p>
                <div className="prompt-grid">
                  {suggestions.slice(0, 4).map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      className="prompt-card"
                      onClick={() => send(suggestion)}
                    >
                      <Sparkles size={14} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chat-thread">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  const isEmergency = message.category === 'emergency';
                  const isSafety = message.category === 'safety';
                  return (
                    <div
                      key={message._id}
                      className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-ai'} ${isEmergency ? 'chat-emergency' : ''}`}
                    >
                      {isUser ? (
                        <Avatar name={user?.name} size="sm" />
                      ) : (
                        <span className="chat-message-ai-avatar"><Bot size={17} /></span>
                      )}
                      <div className="chat-message-content">
                        {isEmergency && (
                          <div className="emergency-label"><HeartPulse size={14} /> Urgent guidance</div>
                        )}
                        {isSafety && (
                          <div className="safety-label"><ShieldCheck size={13} /> Safety note</div>
                        )}
                        <div className="chat-bubble">
                          {isUser ? <p>{message.content}</p> : <RichText text={message.content} />}
                        </div>
                        <span className="chat-time">
                          {isUser ? 'You' : 'MediCare AI'} · {timeLabel(message.createdAt)}
                          {message.optimistic && ' · sending…'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="chat-message chat-message-ai">
                    <span className="chat-message-ai-avatar"><Bot size={17} /></span>
                    <div className="chat-message-content">
                      <div className="chat-bubble typing-bubble" aria-label="MediCare AI is typing">
                        <span /><span /><span />
                      </div>
                      <span className="chat-time">Thinking carefully…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="chat-composer-wrap">
            {messages.length > 0 && !loading && (
              <div className="chat-suggestions">
                {suggestions.slice(2, 5).map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="chat-suggestion-chip"
                    onClick={() => send(suggestion)}
                    disabled={sending}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-composer">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                maxLength={2000}
                placeholder="Ask a general health question…"
                aria-label="Message MediCare AI"
                disabled={sending || loading}
              />
              <button
                type="button"
                className="chat-send"
                onClick={() => send()}
                disabled={!input.trim() || sending || loading}
                aria-label="Send message"
              >
                {sending ? <InlineSpinner size={18} /> : <ArrowUp size={19} />}
              </button>
            </div>
            <div className="chat-composer-meta">
              <span><ShieldCheck size={12} /> Never share sensitive ID or payment details.</span>
              <span>{input.length}/2000 · Enter to send, Shift+Enter for a new line</span>
            </div>
          </div>
        </section>

        <aside className="chat-side">
          <section className="card chat-side-card">
            <span className="chat-side-icon"><HeartPulse size={20} /></span>
            <h3>When to get urgent help</h3>
            <p>Call emergency services for chest pain, breathing difficulty, severe bleeding, fainting, or sudden weakness.</p>
            <div className="emergency-numbers">
              <div><strong>112</strong><span>India · all emergencies</span></div>
              <div><strong>108</strong><span>India · ambulance</span></div>
            </div>
          </section>

          <section className="card chat-side-card">
            <span className="chat-side-icon blue"><RefreshCw size={19} /></span>
            <h3>Make the most of your chat</h3>
            <ul className="mini-list">
              <li>Describe how long symptoms have lasted.</li>
              <li>Mention what makes them better or worse.</li>
              <li>Ask what to prepare for your appointment.</li>
              <li>Never stop prescribed medicine based on AI advice.</li>
            </ul>
          </section>

          <section className="chat-side-note">
            <ShieldCheck size={16} />
            <p>Your conversation is stored securely and visible only to your account.</p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clearHistory}
        title="Clear this conversation?"
        description="All messages will be permanently removed. You can always start a new conversation."
        confirmLabel="Clear conversation"
        loading={clearing}
      />
    </div>
  );
}
