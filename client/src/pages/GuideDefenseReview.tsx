import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function GuideDefenseReview({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: defense, isLoading } = useQuery({ queryKey: ['/api/defenses', id] });
  const [reviewNotes, setReviewNotes] = useState('');

  const review = useMutation({
    mutationFn: async (reviewStatus: string) => {
      const res = await apiRequest('POST', `/api/guide/defenses/${id}/review`, {
        reviewStatus,
        reviewNotes: reviewNotes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/defenses', id] });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  }

  const d = defense as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => setLocation('/guide')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold">Review Defense</h1>
          <p className="text-sm text-muted-foreground">{d?.title}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {d?.submission && (
          <div className="space-y-6">
            <div className="bg-card p-4 rounded-lg border border-border">
              <h2 className="font-medium mb-2">Student's Position</h2>
              <p className="text-sm">{d.submission.pov}</p>
            </div>

            <div className="bg-card p-4 rounded-lg border border-border">
              <h2 className="font-medium mb-2">Evidence ({d.submission.evidence?.length || 0} items)</h2>
              {d.submission.evidence?.map((item: any, i: number) => (
                <div key={i} className="mb-2 pl-3 border-l-2 border-border">
                  <p className="text-sm font-medium">{item.claim}</p>
                  <p className="text-xs text-muted-foreground">{item.source}</p>
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline">
                      {item.sourceUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>

            {d.status === 'submitted' && (
              <div className="bg-card p-4 rounded-lg border border-border">
                <h2 className="font-medium mb-2">Review Notes (optional)</h2>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Feedback for the student..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[80px]"
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => review.mutate('approved')}
                    disabled={review.isPending}
                    className="px-4 py-2 bg-success text-success-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => review.mutate('revision_requested')}
                    disabled={review.isPending}
                    className="px-4 py-2 bg-warning text-warning-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Request Revision
                  </button>
                  <button
                    onClick={() => review.mutate('rejected')}
                    disabled={review.isPending}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Show transcript if debate is active/complete */}
            {d.levelAttempts?.map((attempt: any) => (
              attempt.conversationHistory?.length > 0 && (
                <div key={attempt.id} className="bg-card p-4 rounded-lg border border-border">
                  <h2 className="font-medium mb-2">Debate Transcript (Round {attempt.currentRound}/10)</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {attempt.conversationHistory.map((msg: any, i: number) => (
                      <div key={i} className={`text-sm p-2 rounded ${
                        msg.role === 'user' ? 'bg-accent ml-8' : 'bg-muted mr-8'
                      }`}>
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.role === 'user' ? 'Student' : 'Opponent'} (R{msg.round})
                        </span>
                        <p className="mt-1">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {!d?.submission && (
          <p className="text-muted-foreground text-center py-8">No submission yet.</p>
        )}
      </main>
    </div>
  );
}
