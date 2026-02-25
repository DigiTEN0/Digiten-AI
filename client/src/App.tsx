import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import QuotesPage from "@/pages/quotes";
import QuoteBuilderPage from "@/pages/quote-builder";
import QuoteDetailPage from "@/pages/quote-detail";
import PriceMatrixPage from "@/pages/price-matrix";
import SettingsPage from "@/pages/settings";
import CalendarPage from "@/pages/calendar";
import ClientQuotePage from "@/pages/client-quote";
import LeadFormPage from "@/pages/lead-form";
import AdminPage from "@/pages/admin";
import DossiersPage from "@/pages/dossiers";
import DossierDetailPage from "@/pages/dossier-detail";
import ClientLoginPage from "@/pages/client-login";
import ClientPortalPage from "@/pages/client-portal";
import MedewerkersPage from "@/pages/medewerkers";
import SubscriptionPage from "@/pages/subscription";
import { NotificationBell } from "@/components/notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

function AdminLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b h-12">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/admin" component={AdminPage} />
              <Route path="/admin/users" component={AdminPage} />
              <Route path="/admin/organizations" component={AdminPage} />
              <Route path="/admin/smtp" component={AdminPage} />
              <Route component={AdminPage} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function TenantLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b h-12">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/quotes/new" component={QuoteBuilderPage} />
              <Route path="/quotes/:id" component={QuoteDetailPage} />
              <Route path="/quotes" component={QuotesPage} />
              <Route path="/price-matrix" component={PriceMatrixPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/dossiers/:id" component={DossierDetailPage} />
              <Route path="/dossiers" component={DossiersPage} />
              <Route path="/medewerkers" component={MedewerkersPage} />
              <Route path="/abonnement" component={SubscriptionPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/admin"); }, []);
  return null;
}

function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  const publicPrefixes = ["/auth", "/quote/", "/lead-form/", "/client/"];
  const isPublicRoute = location === "/" || publicPrefixes.some((r) => location === r.replace(/\/$/, "") || location.startsWith(r));
  const isSlugRoute = !isPublicRoute && location.endsWith("-offerte-aanvragen");

  if (isPublicRoute || isSlugRoute) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/quote/:token" component={ClientQuotePage} />
        <Route path="/lead-form/:orgId" component={LeadFormPage} />
        <Route path="/client/login" component={ClientLoginPage} />
        <Route path="/client/portal/:token" component={ClientPortalPage} />
        <Route path="/:slug" component={LeadFormPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  const isAdmin = (user as any)?.isAdmin;

  if (isAdmin) {
    if (!location.startsWith("/admin")) {
      return <AdminRedirect />;
    }
    return <AdminLayout />;
  }

  return <TenantLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
