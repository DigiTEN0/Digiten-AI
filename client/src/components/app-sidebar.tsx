import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Users,
  UsersRound,
  Grid3X3,
  CalendarDays,
  Settings,
  LogOut,
  Zap,
  Shield,
  Building,
  FolderOpen,
  CreditCard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { Organization } from "@shared/schema";

const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, ownerOnly: false },
  { title: "Leads", url: "/quotes", icon: FileText, ownerOnly: false },
  { title: "Dossiers", url: "/dossiers", icon: FolderOpen, ownerOnly: false },
  { title: "Agenda", url: "/calendar", icon: CalendarDays, ownerOnly: false },
  { title: "Medewerkers", url: "/medewerkers", icon: UsersRound, ownerOnly: true },
  { title: "Prijsmatrix", url: "/price-matrix", icon: Grid3X3, ownerOnly: true },
  { title: "Abonnement", url: "/abonnement", icon: CreditCard, ownerOnly: true },
  { title: "Instellingen", url: "/settings", icon: Settings, ownerOnly: true },
];

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Gebruikers", url: "/admin/users", icon: Users },
  { title: "Organisaties", url: "/admin/organizations", icon: Building },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const isMedewerker = (user as any)?.role === "medewerker";

  const { data: org } = useQuery<Organization>({
    queryKey: ["/api/organization"],
    enabled: !isAdmin,
  });

  const menuItems = isAdmin
    ? adminMenuItems
    : baseMenuItems.filter(item => !item.ownerOnly || !isMedewerker);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/10">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
          ) : org?.logo ? (
            <img
              src={org.logo}
              alt={org.name}
              style={{ height: `${Math.min(org.logoSize || 32, 36)}px` }}
              className="max-w-[120px] object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Zap className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-tight truncate block" data-testid="text-app-name">
              {isAdmin ? "Digiten.ai" : (org?.name || "Digiten.ai")}
            </span>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              {isAdmin ? "Admin Panel" : "CPQ Platform"}
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Beheer" : "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url + "/"))}
                  >
                    <Link href={item.url} data-testid={`link-${item.url.replace(/\//g, "-").slice(1)}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {(user as any)?.fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {(user as any)?.fullName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isMedewerker ? "Medewerker" : isAdmin ? "Admin" : "Eigenaar"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => logout.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Uitloggen
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
