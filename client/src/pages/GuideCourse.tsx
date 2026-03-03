import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function GuideCourse({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { data: course, isLoading: courseLoading } = useQuery({ queryKey: ['/api/guide/courses', id] });
  const { data: defenses, isLoading: defensesLoading } = useQuery({ queryKey: ['/api/guide/courses', id, 'defenses'] });

  if (courseLoading || defensesLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  }

  const courseData = course as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button onClick={() => setLocation('/guide')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            &larr; Back to dashboard
          </button>
          <h1 className="text-xl font-bold">{courseData?.name}</h1>
          <p className="text-sm text-muted-foreground">{courseData?.code}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-4">Student Defenses</h2>

        {!(defenses as any[])?.length ? (
          <p className="text-muted-foreground">No defenses submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {(defenses as any[]).map((defense: any) => (
              <button
                key={defense.id}
                onClick={() => setLocation(`/guide/defenses/${defense.id}`)}
                className="w-full text-left p-4 bg-card rounded-lg border border-border hover:shadow-card-hover transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{defense.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {defense.user?.name || 'Unknown'} &middot; {defense.status}
                    </p>
                  </div>
                  {defense.totalScore !== null && (
                    <span className="text-lg font-semibold">{defense.totalScore}/20</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
