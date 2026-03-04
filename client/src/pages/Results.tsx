import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

const AXIS_LABELS: Record<string, { label: string; description: string }> = {
  factual_accuracy: { label: 'Factual Accuracy', description: 'Verifiable claims, source attribution, error acknowledgment, numerical precision' },
  depth_of_reasoning: { label: 'Depth of Reasoning', description: 'Causal chains, multiple perspectives, implications, novel connections' },
  epistemic_honesty: { label: 'Epistemic Honesty', description: 'Acknowledges limits, distinguishes evidence vs. inference, updates position, intellectual humility' },
  composure_under_pressure: { label: 'Composure Under Pressure', description: 'Stays focused, redirects gracefully, avoids stalling, maintains rigor late' },
  argument_evolution: { label: 'Argument Evolution', description: 'Builds on earlier points, integrates opponent\'s valid points, refines position, coherent arc' },
  // Legacy axis names for backward compatibility
  evidence_quality: { label: 'Evidence Quality', description: 'Source quality and citation' },
  argumentation_depth: { label: 'Argumentation Depth', description: 'Logical structure and depth' },
  counter_engagement: { label: 'Counter-Engagement', description: 'Addressing challenges directly' },
  adaptability: { label: 'Adaptability', description: 'Adjusting under pressure' },
  synthesis: { label: 'Synthesis', description: 'Cross-source connections' },
};

export default function Results({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [revisedPov, setRevisedPov] = useState('');
  const [showRevisedForm, setShowRevisedForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/defenses', id, 'scores'],
  });

  const submitRevisedPov = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', `/api/defenses/${id}/revised-pov`, { revisedPov: text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses', id, 'scores'] });
      setShowRevisedForm(false);
    },
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
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium">{AXIS_LABELS[axis.axis]?.label || axis.axis.replace(/_/g, ' ')}</h3>
                      <span className="font-semibold">{axis.score}/{axis.maxScore}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{AXIS_LABELS[axis.axis]?.description}</p>
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

        {/* Revised Position */}
        {results?.defense?.totalScore != null && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Revised Position</h2>
            {results?.attempts?.[0]?.revisedPov ? (
              <div className="bg-card p-4 rounded-lg border border-border">
                <p className="text-sm font-serif leading-relaxed">{results.attempts[0].revisedPov}</p>
              </div>
            ) : showRevisedForm ? (
              <div className="bg-card p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  After the debate, how has your position evolved? Incorporate what you learned from the opponent's challenges.
                </p>
                <textarea
                  value={revisedPov}
                  onChange={(e) => setRevisedPov(e.target.value)}
                  placeholder="Write your revised position..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[120px] text-sm"
                  rows={4}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => submitRevisedPov.mutate(revisedPov)}
                    disabled={!revisedPov.trim() || submitRevisedPov.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {submitRevisedPov.isPending ? 'Saving...' : 'Save Revised Position'}
                  </button>
                  <button
                    onClick={() => { setShowRevisedForm(false); setRevisedPov(''); }}
                    className="px-4 py-2 border border-border rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRevisedForm(true)}
                className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
              >
                Write Your Revised Position
              </button>
            )}
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
