"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { LogOut, Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { TunnelMark } from "@/components/tunnel-mark";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

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

const NAV_ITEMS = [{ title: "Domains", href: "/", icon: Network }];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <TunnelMark className="size-7 shrink-0" />
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Tunnel Manager
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ChangePasswordDialog />
        <Button variant="ghost" className="justify-start" onClick={handleLogout}>
          <LogOut />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
