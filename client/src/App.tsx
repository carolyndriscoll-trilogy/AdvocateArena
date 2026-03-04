import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

const Home = lazy(() => import("@/pages/Home"));
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
      <Route path="/" component={Home} />
      <Route path="/arena/new" component={CreateDefense} />
      <Route path="/arena/:id">
        {(params) => <DefenseDetail id={params.id} />}
      </Route>
      <Route path="/arena/:id/submit">
        {(params) => <SubmissionForm id={params.id} />}
      </Route>
      <Route path="/arena/:id/debate">
        {(params) => <DebateArena id={params.id} />}
      </Route>
      <Route path="/arena/:id/results">
        {(params) => <Results id={params.id} />}
      </Route>
      <Route path="/arena/:id/reflection">
        {(params) => <Reflection id={params.id} />}
      </Route>
      <Route path="/guide" component={GuideDashboard} />
      <Route path="/guide/courses/:id">
        {(params) => <GuideCourse id={params.id} />}
      </Route>
      <Route path="/guide/defenses/:id">
        {(params) => <GuideDefenseReview id={params.id} />}
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
