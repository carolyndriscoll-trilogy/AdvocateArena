import { useDefenses, useCreateDefense } from '@/hooks/useDefense';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useState } from 'react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Submitted', color: 'bg-info-soft text-info' },
  under_review: { label: 'Under Review', color: 'bg-warning-soft text-warning' },
  approved: { label: 'Ready', color: 'bg-success-soft text-success' },
  active: { label: 'In Progress', color: 'bg-warning-soft text-warning' },
  complete: { label: 'Complete', color: 'bg-success-soft text-success' },
  failed: { label: 'Failed', color: 'bg-destructive-soft text-destructive' },
};

export default function Home() {
  const { user, isGuide } = useAuth();
  const { data: defenses, isLoading } = useDefenses();
  const createDefense = useCreateDefense();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  async function handleCreate() {
    if (!title.trim()) return;
    const defense = await createDefense.mutateAsync({ title: title.trim() });
    setShowCreate(false);
    setTitle('');
    setLocation(`/arena/${defense.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">The Advocate's Arena</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex gap-2">
            {isGuide && (
              <button
                onClick={() => setLocation('/guide')}
                className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
              >
                Guide Dashboard
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
            >
              New Defense
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {showCreate && (
          <div className="mb-6 p-4 bg-card rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-3">Create New Defense</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What position will you defend?"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={!title.trim() || createDefense.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setTitle(''); }}
                className="px-4 py-2 border border-border rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">Your Defenses</h2>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground">Loading defenses...</div>
        ) : !defenses || (defenses as any[]).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-serif mb-2">No defenses yet</p>
            <p className="text-sm">Create your first defense to enter the arena.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(defenses as any[]).map((defense: any) => {
              const statusInfo = STATUS_LABELS[defense.status] || STATUS_LABELS.draft;
              return (
                <button
                  key={defense.id}
                  onClick={() => setLocation(`/arena/${defense.id}`)}
                  className="w-full text-left p-4 bg-card rounded-lg border border-border hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{defense.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {defense.mode === 'sparring' ? 'Sparring' : 'Assessed'} &middot;{' '}
                        {new Date(defense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {defense.totalScore !== null && (
                        <span className="text-lg font-semibold">{defense.totalScore}/20</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
