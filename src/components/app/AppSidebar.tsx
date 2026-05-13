import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  Cloud,
  Database,
  Network,
  Settings,
  Zap,
  CalendarClock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { HealthBadge } from "./HealthBadge";

const sections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Resource Graph", url: "/graph", icon: Network },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "SQS", url: "/sqs", icon: Boxes },
      { title: "S3", url: "/s3", icon: Database },
      { title: "Lambda", url: "/lambda", icon: Zap },
      { title: "EventBridge", url: "/events", icon: CalendarClock },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-info shadow-lg shadow-primary/20">
            <Cloud className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Localstash</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              LocalStack UI
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-2 pt-1 group-data-[collapsible=icon]:hidden">
          <HealthBadge />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
