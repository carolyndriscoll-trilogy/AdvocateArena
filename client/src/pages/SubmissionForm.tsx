import { useState } from 'react';
import { useLocation } from 'wouter';
import { useDefense } from '@/hooks/useDefense';

interface EvidenceItem {
  claim: string;
  source: string;
  sourceUrl: string;
}

export default function SubmissionForm({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { defense, isLoading, createSubmission } = useDefense(id);
  const [pov, setPov] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([
    { claim: '', source: '', sourceUrl: '' },
  ]);

  function addEvidence() {
    setEvidence([...evidence, { claim: '', source: '', sourceUrl: '' }]);
  }

  function updateEvidence(index: number, field: keyof EvidenceItem, value: string) {
    const updated = [...evidence];
    updated[index] = { ...updated[index], [field]: value };
    setEvidence(updated);
  }

  function removeEvidence(index: number) {
    if (evidence.length <= 1) return;
    setEvidence(evidence.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validEvidence = evidence.filter(e => e.claim.trim() && e.source.trim());
    if (!pov.trim() || validEvidence.length === 0) return;

    await createSubmission.mutateAsync({
      pov: pov.trim(),
      evidence: validEvidence,
    });

    setLocation(`/arena/${id}`);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => setLocation(`/arena/${id}`)} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back to defense
          </button>
          <h1 className="text-xl font-bold">Submit Evidence</h1>
          <p className="text-sm text-muted-foreground">{defense?.title}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Your Point of View</label>
            <textarea
              value={pov}
              onChange={(e) => setPov(e.target.value)}
              placeholder="State your defensible position clearly and concisely..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Evidence</label>
              <button type="button" onClick={addEvidence} className="text-sm text-secondary hover:underline">
                + Add evidence
              </button>
            </div>

            <div className="space-y-4">
              {evidence.map((item, i) => (
                <div key={i} className="p-4 bg-card rounded-lg border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground">Evidence #{i + 1}</span>
                    {evidence.length > 1 && (
                      <button type="button" onClick={() => removeEvidence(i)} className="text-xs text-destructive hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.claim}
                    onChange={(e) => updateEvidence(i, 'claim', e.target.value)}
                    placeholder="Claim or finding"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <input
                    type="text"
                    value={item.source}
                    onChange={(e) => updateEvidence(i, 'source', e.target.value)}
                    placeholder="Source (author, publication, year)"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <input
                    type="url"
                    value={item.sourceUrl}
                    onChange={(e) => updateEvidence(i, 'sourceUrl', e.target.value)}
                    placeholder="Source URL (optional)"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!pov.trim() || evidence.every(e => !e.claim.trim()) || createSubmission.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createSubmission.isPending ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </main>
    </div>
  );
}
