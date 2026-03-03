import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const CreateDefense = lazy(() => import("@/pages/CreateDefense"));
const DefenseDetail = lazy(() => import("@/pages/DefenseDetail"));
const SubmissionForm = lazy(() => import("@/pages/SubmissionForm"));
const DebateArena = lazy(() => import("@/pages/DebateArena"));
const Results = lazy(() => import("@/pages/Results"));
const Reflection = lazy(() => import("@/pages/Reflection"));
const GuideDashboard = lazy(() => import("@/pages/GuideDashboard"));
const GuideCourse = lazy(() => import("@/pages/GuideCourse"));
const GuideDefenseReview = lazy(() => import("@/pages/GuideDefenseReview"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground font-serif">Loading...</div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute><Home /></ProtectedRoute>
      </Route>
      <Route path="/arena/new">
        <ProtectedRoute><CreateDefense /></ProtectedRoute>
      </Route>
      <Route path="/arena/:id">
        {(params) => <ProtectedRoute><DefenseDetail id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/arena/:id/submit">
        {(params) => <ProtectedRoute><SubmissionForm id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/arena/:id/debate">
        {(params) => <ProtectedRoute><DebateArena id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/arena/:id/results">
        {(params) => <ProtectedRoute><Results id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/arena/:id/reflection">
        {(params) => <ProtectedRoute><Reflection id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/guide">
        <ProtectedRoute><GuideDashboard /></ProtectedRoute>
      </Route>
      <Route path="/guide/courses/:id">
        {(params) => <ProtectedRoute><GuideCourse id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/guide/defenses/:id">
        {(params) => <ProtectedRoute><GuideDefenseReview id={params.id} /></ProtectedRoute>}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
        <Router />
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
