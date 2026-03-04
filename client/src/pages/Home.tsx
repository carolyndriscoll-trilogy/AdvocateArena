import { useDefenses, useCreateDefense } from '@/hooks/useDefense';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { data: leaderboard } = useQuery({ queryKey: ['/api/leaderboard'], enabled: showLeaderboard });
  const { data: myStats } = useQuery({ queryKey: ['/api/leaderboard/me'] });

  const [mode, setMode] = useState<'assessed' | 'sparring'>('assessed');
  const { data: sequences } = useQuery({ queryKey: ['/api/sparring-sequences'], enabled: mode === 'sparring' });
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [maxRounds, setMaxRounds] = useState(10);

  async function handleCreate() {
    if (!title.trim()) return;
    const defense = await createDefense.mutateAsync({
      title: title.trim(),
      mode,
      maxRounds: mode === 'sparring' && selectedSequence ? undefined : maxRounds,
    });
    setShowCreate(false);
    setTitle('');
    setMode('assessed');
    setSelectedSequence(null);
    setMaxRounds(10);
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
        {/* Player stats bar */}
        {(myStats as any)?.eloRating && (
          <div className="mb-6 flex items-center gap-4 text-sm">
            <div className="bg-card border border-border rounded-md px-3 py-2">
              <span className="text-muted-foreground">Elo:</span>{' '}
              <span className="font-semibold">{(myStats as any).eloRating}</span>
            </div>
            <div className="bg-card border border-border rounded-md px-3 py-2">
              <span className="text-muted-foreground">Record:</span>{' '}
              <span className="font-semibold">{(myStats as any).wins}W-{(myStats as any).losses}L</span>
            </div>
            {(myStats as any).streak > 0 && (
              <div className="bg-card border border-border rounded-md px-3 py-2">
                <span className="text-muted-foreground">Streak:</span>{' '}
                <span className="font-semibold text-success">{(myStats as any).streak}</span>
              </div>
            )}
            <div className="bg-card border border-border rounded-md px-3 py-2">
              <span className="text-muted-foreground">Points:</span>{' '}
              <span className="font-semibold">{(myStats as any).totalPoints}</span>
            </div>
            {(myStats as any).rank && (
              <div className="bg-card border border-border rounded-md px-3 py-2">
                <span className="text-muted-foreground">Rank:</span>{' '}
                <span className="font-semibold">#{(myStats as any).rank}</span>
              </div>
            )}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {showLeaderboard && leaderboard && (
          <div className="mb-6 bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">Leaderboard</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b border-border">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Player</th>
                  <th className="text-right py-1">Elo</th>
                  <th className="text-right py-1">W/L</th>
                  <th className="text-right py-1">Points</th>
                </tr>
              </thead>
              <tbody>
                {(leaderboard as any[]).map((entry: any, i: number) => (
                  <tr key={entry.userId} className={`border-b border-border/50 ${entry.userId === user?.id ? 'bg-accent' : ''}`}>
                    <td className="py-1.5">{i + 1}</td>
                    <td className="py-1.5">{entry.userId === user?.id ? 'You' : entry.userId.slice(0, 8)}</td>
                    <td className="py-1.5 text-right font-medium">{entry.eloRating}</td>
                    <td className="py-1.5 text-right">{entry.wins}-{entry.losses}</td>
                    <td className="py-1.5 text-right">{entry.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="mb-6 p-4 bg-card rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-3">Create New Defense</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What position will you defend?"
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-4 mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('assessed')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${mode === 'assessed' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                >
                  Assessed
                </button>
                <button
                  onClick={() => setMode('sparring')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${mode === 'sparring' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                >
                  Sparring
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-muted-foreground text-xs">Rounds:</label>
                <select
                  value={maxRounds}
                  onChange={(e) => setMaxRounds(Number(e.target.value))}
                  className="px-2 py-1 border border-input rounded-md bg-background text-xs"
                >
                  {[3, 5, 7, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            {mode === 'sparring' && !!sequences && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Choose a sparring sequence (optional):</p>
                <div className="grid grid-cols-2 gap-2">
                  {(sequences as any[]).map((seq: any) => (
                    <button
                      key={seq.type}
                      onClick={() => {
                        setSelectedSequence(selectedSequence === seq.type ? null : seq.type);
                        setMaxRounds(seq.rounds);
                      }}
                      className={`text-left p-2 rounded-md border text-xs ${
                        selectedSequence === seq.type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium">{seq.name} ({seq.rounds}R)</div>
                      <div className="text-muted-foreground mt-0.5">{seq.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || createDefense.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setTitle(''); setMode('assessed'); setSelectedSequence(null); setMaxRounds(10); }}
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
