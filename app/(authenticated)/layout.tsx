import { AppSidebar } from "@/components/app-sidebar";
import { DomainStreamProvider } from "@/components/domain-stream-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DomainStreamProvider />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
