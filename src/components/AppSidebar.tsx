import {
  LayoutDashboard,
  FileSearch,
  Target,
  FileText,
  Sparkles,
  Compass,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/i18n/LanguageContext";
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
  useSidebar,
} from "@/components/ui/sidebar";
import type { TranslationKey } from "@/i18n/translations";

const navItems: {
  titleKey: TranslationKey;
  url: string;
  icon: typeof LayoutDashboard;
}[] = [
  { titleKey: "nav.dashboard", url: "/", icon: LayoutDashboard },
  { titleKey: "nav.atsParser", url: "/ats-parser", icon: FileSearch },
  { titleKey: "nav.keywordMatcher", url: "/keyword-matcher", icon: Target },
  { titleKey: "nav.resumeBuilder", url: "/resume-builder", icon: FileText },
  { titleKey: "nav.careerCopilot", url: "/career-copilot", icon: Compass },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useLanguage();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-display font-bold text-sidebar-accent-foreground tracking-tight">
                  {t("sidebar.brand")}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#B04EB8]/20 text-[#D7F7E1] border border-[#B04EB8]/30">
                  AI
                </span>
              </div>
              <span className="text-[11px] text-sidebar-muted">
                {t("sidebar.tagline")}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[10px] font-mono uppercase tracking-widest font-semibold px-3 mb-1">
            {t("sidebar.tools")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground transition-all"
                      activeClassName="bg-sidebar-accent text-white font-semibold border-l-2 border-[#B04EB8] shadow-sm"
                    >
                      <item.icon className="mr-2.5 h-4 w-4 shrink-0 text-[#B04EB8]" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
