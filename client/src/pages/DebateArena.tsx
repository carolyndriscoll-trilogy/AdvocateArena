import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useDefense } from '@/hooks/useDefense';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  round: number;
}

export default function DebateArena({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { defense, isLoading, startDebate } = useDefense(id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const currentRound = messages.filter(m => m.role === 'user').length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleStart() {
    await startDebate.mutateAsync();
    setStarted(true);
  }

  async function handleSend() {
    if (!input.trim() || wordCount > 150 || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      round: currentRound + 1,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await apiRequest('POST', `/api/defenses/${id}/debate`, {
        message: userMessage.content,
      });
      const data = await res.json();

      // TODO: Replace with streaming response handling
      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          round: currentRound + 1,
        }]);
      }
    } catch (err: any) {
      console.error('Debate error:', err);
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <button onClick={() => setLocation(`/arena/${id}`)} className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Exit
          </button>
          <h1 className="text-lg font-bold mt-1">{defense?.title}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className={`font-medium ${currentRound >= 9 ? 'text-warning' : 'text-muted-foreground'}`}>
            Round {currentRound} / 10
          </div>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — POV & evidence reference */}
        <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto shrink-0 hidden lg:block">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Your Position</h3>
          <p className="text-sm font-serif mb-4">{defense?.submission?.pov}</p>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Evidence</h3>
          {defense?.submission?.evidence?.map((item: any, i: number) => (
            <div key={i} className="text-xs mb-2 p-2 bg-accent rounded">
              <p className="font-medium">{item.claim}</p>
              <p className="text-muted-foreground">{item.source}</p>
            </div>
          ))}
        </div>

        {/* Center — debate transcript */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-styled">
            {!started && defense?.status === 'approved' && (
              <div className="text-center py-12">
                <h2 className="text-lg font-serif mb-2">Ready to Enter the Arena?</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You'll face 10 rounds of adversarial debate. 150 words per response.
                </p>
                <button
                  onClick={handleStart}
                  disabled={startDebate.isPending}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {startDebate.isPending ? 'Starting...' : 'Begin Debate'}
                </button>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[80%] ${
                  msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-arena-student border border-border'
                    : 'bg-arena-opponent'
                }`}>
                  <p className={`text-sm leading-relaxed ${
                    msg.role === 'assistant' ? 'font-serif' : ''
                  }`}>
                    {msg.content}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {msg.role === 'user' ? 'You' : 'Opponent'} &middot; Round {msg.round}
                </p>
              </div>
            ))}

            {sending && (
              <div className="mr-auto">
                <div className="p-3 rounded-lg bg-arena-opponent">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {(started || defense?.status === 'active') && currentRound < 10 && (
            <div className="border-t border-border p-4 bg-card">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Defend your position..."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[60px]"
                    rows={2}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <span className={`absolute bottom-2 right-2 text-xs ${
                    wordCount > 150 ? 'text-destructive font-bold' :
                    wordCount > 140 ? 'text-warning animate-word-warning' :
                    'text-muted-foreground'
                  }`}>
                    {wordCount}/150
                  </span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || wordCount > 150 || sending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 h-[60px]"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — round tracker */}
        <div className="w-48 border-l border-border bg-card p-4 shrink-0 hidden xl:block">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Rounds</h3>
          <div className="space-y-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((round) => (
              <div
                key={round}
                className={`text-xs px-2 py-1 rounded ${
                  round <= currentRound
                    ? 'bg-success-soft text-success'
                    : round === currentRound + 1
                    ? 'bg-warning-soft text-warning font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                Round {round}
                {round === 3 && <span className="ml-1 opacity-60">(steelman)</span>}
                {round === 9 && <span className="ml-1 opacity-60">(pivot)</span>}
                {round === 10 && <span className="ml-1 opacity-60">(final)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
