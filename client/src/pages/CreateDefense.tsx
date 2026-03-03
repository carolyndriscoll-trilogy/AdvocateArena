import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateDefense } from '@/hooks/useDefense';

export default function CreateDefense() {
  const [, setLocation] = useLocation();
  const createDefense = useCreateDefense();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'assessed' | 'sparring'>('assessed');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const defense = await createDefense.mutateAsync({ title: title.trim(), mode });
    setLocation(`/arena/${defense.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button onClick={() => setLocation('/')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold">New Defense</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">What position will you defend?</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 'Remote work improves productivity for knowledge workers'"
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('assessed')}
                className={`flex-1 p-3 rounded-md border text-sm ${
                  mode === 'assessed'
                    ? 'border-primary bg-accent font-medium'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <div className="font-medium">Assessed</div>
                <div className="text-muted-foreground mt-1">Instructor-graded, counts toward course</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('sparring')}
                className={`flex-1 p-3 rounded-md border text-sm ${
                  mode === 'sparring'
                    ? 'border-primary bg-accent font-medium'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <div className="font-medium">Sparring</div>
                <div className="text-muted-foreground mt-1">Practice mode, no grade impact</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim() || createDefense.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createDefense.isPending ? 'Creating...' : 'Create Defense'}
          </button>
        </form>
      </main>
    </div>
  );
}
