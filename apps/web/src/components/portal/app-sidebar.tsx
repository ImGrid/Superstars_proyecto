"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronsUpDown } from "lucide-react";
import { Icon } from "@iconify/react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { getNavItems } from "@/lib/auth/nav-config";
import { rolConfig } from "@/lib/estado-labels";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: user, isLoading } = useAuth();
  const logoutMutation = useLogout();

  const navItems = user ? getNavItems(user.rol) : [];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-700 text-white font-heading text-xs font-bold">
                  SI
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-semibold">
                    SUPERIMPACT360
                  </span>
                  <span className="truncate text-xs">Plataforma de Competencias</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* navegacion por rol */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuButton>
                        <Skeleton className="size-4 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                : navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href + "/"));

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          size="lg"
                          className="h-10"
                        >
                          <Link href={item.href}>
                            <Icon icon={item.icon} className="size-5" />
                            <span className="text-base">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* usuario + logout */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading ? (
              <SidebarMenuButton size="lg">
                <Skeleton className="size-8 rounded-lg" />
                <div className="grid flex-1 gap-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </SidebarMenuButton>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-orange-700 text-white text-xs">
                        {user.nombre.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.nombre}
                      </span>
                      <Badge
                        variant="secondary"
                        className="w-fit text-[10px] px-1.5 py-0"
                      >
                        {rolConfig[user.rol]?.label ?? user.rol}
                      </Badge>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 size-4" />
                    {logoutMutation.isPending ? "Cerrando..." : "Cerrar sesion"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
