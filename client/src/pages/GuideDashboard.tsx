import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function GuideDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: courses, isLoading } = useQuery({ queryKey: ['/api/guide/courses'] });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const createCourse = useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      const res = await apiRequest('POST', '/api/guide/courses', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guide/courses'] });
      setShowCreate(false);
      setName('');
      setCode('');
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => setLocation('/')} className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back to Arena
            </button>
            <h1 className="text-xl font-bold mt-1">Guide Dashboard</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
          >
            New Course
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {showCreate && (
          <div className="mb-6 p-4 bg-card rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-3">Create Course</h2>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Course name"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Course code"
                className="w-32 px-3 py-2 border border-input rounded-md bg-background"
              />
              <button
                onClick={() => createCourse.mutate({ name, code })}
                disabled={!name.trim() || !code.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">Your Courses</h2>

        {isLoading ? (
          <div className="animate-pulse">Loading courses...</div>
        ) : !(courses as any[])?.length ? (
          <p className="text-muted-foreground">No courses yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {(courses as any[]).map((course: any) => (
              <button
                key={course.id}
                onClick={() => setLocation(`/guide/courses/${course.id}`)}
                className="w-full text-left p-4 bg-card rounded-lg border border-border hover:shadow-card-hover transition-shadow"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{course.name}</h3>
                    <p className="text-sm text-muted-foreground">{course.code}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full h-fit ${course.isActive ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}>
                    {course.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
