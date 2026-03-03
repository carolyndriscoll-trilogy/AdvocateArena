import { useDefense } from '@/hooks/useDefense';
import { useLocation } from 'wouter';

export default function DefenseDetail({ id }: { id: string }) {
  const { defense, isLoading } = useDefense(id);
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading defense...</div>
      </div>
    );
  }

  if (!defense) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Defense not found</p>
      </div>
    );
  }

  // Route based on status
  const status = defense.status;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => setLocation('/')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back to defenses
          </button>
          <h1 className="text-xl font-bold">{defense.title}</h1>
          <p className="text-sm text-muted-foreground capitalize">{defense.mode} &middot; {status}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {status === 'draft' && !defense.submission && (
          <div className="text-center py-8">
            <h2 className="text-lg font-serif mb-2">Submit Your Evidence</h2>
            <p className="text-muted-foreground mb-4">State your position and provide supporting evidence.</p>
            <button
              onClick={() => setLocation(`/arena/${id}/submit`)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90"
            >
              Begin Submission
            </button>
          </div>
        )}

        {(status === 'submitted' || status === 'under_review') && (
          <div className="text-center py-8">
            <h2 className="text-lg font-serif mb-2">Awaiting Review</h2>
            <p className="text-muted-foreground">Your submission is being reviewed by your instructor.</p>
            {defense.submission && (
              <div className="mt-6 text-left bg-card p-4 rounded-lg border border-border">
                <h3 className="font-medium mb-2">Your Position</h3>
                <p className="text-sm">{defense.submission.pov}</p>
                <h3 className="font-medium mt-4 mb-2">Evidence ({defense.submission.evidence?.length || 0} items)</h3>
                {defense.submission.evidence?.map((item: any, i: number) => (
                  <div key={i} className="text-sm mb-2 pl-3 border-l-2 border-border">
                    <p className="font-medium">{item.claim}</p>
                    <p className="text-muted-foreground">{item.source}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status === 'approved' && (
          <div className="text-center py-8">
            <h2 className="text-lg font-serif mb-2">Ready for Debate</h2>
            <p className="text-muted-foreground mb-4">Your evidence has been approved. Enter the arena when ready.</p>
            <button
              onClick={() => setLocation(`/arena/${id}/debate`)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90"
            >
              Enter the Arena
            </button>
          </div>
        )}

        {status === 'active' && (
          <div className="text-center py-8">
            <h2 className="text-lg font-serif mb-2">Debate In Progress</h2>
            <p className="text-muted-foreground mb-4">Continue your defense.</p>
            <button
              onClick={() => setLocation(`/arena/${id}/debate`)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90"
            >
              Continue Debate
            </button>
          </div>
        )}

        {(status === 'complete' || status === 'failed') && (
          <div className="text-center py-8">
            <h2 className="text-lg font-serif mb-2">
              {status === 'complete' ? 'Defense Complete' : 'Defense Failed'}
            </h2>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => setLocation(`/arena/${id}/results`)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90"
              >
                View Results
              </button>
              {!defense.reflection && (
                <button
                  onClick={() => setLocation(`/arena/${id}/reflection`)}
                  className="px-6 py-2 border border-border rounded-md font-medium hover:bg-accent"
                >
                  Write Reflection
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
