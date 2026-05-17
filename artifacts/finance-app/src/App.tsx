import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

import AppLayout from "@/components/layout/app-layout";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import AccountsPage from "@/pages/accounts";
import CategoriesPage from "@/pages/categories";
import BudgetsPage from "@/pages/budgets";
import GoalsPage from "@/pages/goals";
import ReportsPage from "@/pages/reports";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Configure the API client to inject JWT from localStorage
setAuthTokenGetter(() => localStorage.getItem("token"));

function ProtectedRoute({ component: Component, adminOnly = false }: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (adminOnly && user?.role !== "admin") return <Redirect to="/" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <AuthRoute component={LoginPage} />
      </Route>
      <Route path="/register">
        <AuthRoute component={RegisterPage} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={TransactionsPage} />
      </Route>
      <Route path="/accounts">
        <ProtectedRoute component={AccountsPage} />
      </Route>
      <Route path="/categories">
        <ProtectedRoute component={CategoriesPage} />
      </Route>
      <Route path="/budgets">
        <ProtectedRoute component={BudgetsPage} />
      </Route>
      <Route path="/goals">
        <ProtectedRoute component={GoalsPage} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} adminOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="finance-app-theme">
        <I18nProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
