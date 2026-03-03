import { useState } from 'react';
import { useLocation } from 'wouter';
import { useDefense } from '@/hooks/useDefense';

export default function Reflection({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { defense, isLoading, submitReflection } = useDefense(id);
  const [text, setText] = useState('');

  const charCount = text.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (charCount < 300 || charCount > 3000) return;
    await submitReflection.mutateAsync(text);
    setLocation(`/arena/${id}`);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  }

  if (defense?.reflection) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <button onClick={() => setLocation(`/arena/${id}`)} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
              &larr; Back
            </button>
            <h1 className="text-xl font-bold">Your Reflection</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-card p-6 rounded-lg border border-border">
            <p className="whitespace-pre-wrap">{defense.reflection.reflection}</p>
          </div>
          {defense.reflection.aiCoachingResponse && (
            <div className="mt-6 bg-info-soft p-6 rounded-lg">
              <h3 className="font-medium mb-2">AI Coach Response</h3>
              <p className="text-sm">{defense.reflection.aiCoachingResponse}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => setLocation(`/arena/${id}`)} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold">Post-Debate Reflection</h1>
          <p className="text-sm text-muted-foreground">{defense?.title}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Reflect on your debate experience (300-3000 characters)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you learn? What would you do differently? Which arguments were strongest?"
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px]"
              required
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${
                charCount < 300 ? 'text-destructive' :
                charCount > 3000 ? 'text-destructive' :
                'text-muted-foreground'
              }`}>
                {charCount}/300-3000 characters
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={charCount < 300 || charCount > 3000 || submitReflection.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitReflection.isPending ? 'Submitting...' : 'Submit Reflection'}
          </button>
        </form>
      </main>
    </div>
  );
}
