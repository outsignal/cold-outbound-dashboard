import { prisma } from "@/lib/db";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalMobileMenu } from "@/components/portal/portal-mobile-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

interface PortalAppShellProps {
  workspaceSlug: string;
  children: React.ReactNode;
}

export async function PortalAppShell({ workspaceSlug, children }: PortalAppShellProps) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { name: true },
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden md:flex">
          <PortalSidebar
            workspaceSlug={workspaceSlug}
            workspaceName={workspace?.name ?? workspaceSlug}
          />
        </div>
        <PortalMobileMenu
          workspaceSlug={workspaceSlug}
          workspaceName={workspace?.name ?? workspaceSlug}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
