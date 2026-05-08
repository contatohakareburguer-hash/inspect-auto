import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  History,
  Plus,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import logoUrl from "@/assets/logo.png";

const items = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Nova inspeção", url: "/", icon: Plus, hash: "nova" },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Estatísticas", url: "/estatisticas", icon: BarChart3 },
  { title: "Manual do usuário", url: "/manual", icon: BookOpen },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <Link to="/" className="flex items-center gap-2 px-2 py-2" onClick={() => setOpenMobile(false)}>
          <img src={logoUrl} alt="InspectAuto" className="h-9 w-9 rounded-lg shadow-card" />
          {!collapsed && (
            <div>
              <div className="text-sm font-bold leading-tight">InspectAuto</div>
              <div className="text-[10px] leading-tight text-muted-foreground">Inspeção profissional</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link
                      to={item.url}
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
