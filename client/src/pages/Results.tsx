import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function Results({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ['/api/defenses', id, 'scores'],
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading results...</div></div>;
  }

  const results = data as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => setLocation(`/arena/${id}`)} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold">Defense Results</h1>
          <p className="text-sm text-muted-foreground">{results?.defense?.title}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {results?.defense?.totalScore !== null && (
          <div className="text-center mb-8">
            <div className="text-5xl font-bold font-serif">{results.defense.totalScore}</div>
            <div className="text-lg text-muted-foreground">/20 points</div>
          </div>
        )}

        {/* Score breakdown */}
        {results?.attempts?.map((attempt: any) => (
          attempt.evaluationOutput && (
            <div key={attempt.id} className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Score Breakdown</h2>
              <div className="space-y-3">
                {attempt.evaluationOutput.scores?.map((axis: any) => (
                  <div key={axis.axis} className="bg-card p-4 rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium capitalize">{axis.axis.replace(/_/g, ' ')}</h3>
                      <span className="font-semibold">{axis.score}/{axis.maxScore}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-secondary rounded-full h-2 transition-all"
                        style={{ width: `${(axis.score / axis.maxScore) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      {axis.criteria?.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={c.met ? 'text-success' : 'text-destructive'}>
                            {c.met ? '\u2713' : '\u2717'}
                          </span>
                          <span>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}

        {/* Coaching */}
        {results?.coaching?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Coaching</h2>
            <div className="space-y-3">
              {results.coaching.map((item: any) => (
                <div key={item.id} className="bg-card p-4 rounded-lg border border-border">
                  <h3 className="font-medium capitalize text-sm">{item.axis.replace(/_/g, ' ')}</h3>
                  <p className="text-sm mt-1">{item.prescription}</p>
                  <span className={`text-xs mt-2 inline-block px-2 py-0.5 rounded-full ${
                    item.status === 'addressed' ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!results?.defense?.totalScore && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Results are being processed. Check back shortly.</p>
          </div>
        )}
      </main>
    </div>
  );
}
