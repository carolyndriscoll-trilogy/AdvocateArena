import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold font-serif mb-2">404</h1>
      <p className="text-muted-foreground mb-4">This page doesn't exist.</p>
      <button
        onClick={() => setLocation('/')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
      >
        Go Home
      </button>
    </div>
  );
}
