export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OnboardPageClient } from "./onboard-page-client";

export default async function ProposalsPage() {
  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: "desc" },
  });

  const onboardingInvites = await prisma.onboardingInvite.findMany({
    orderBy: { createdAt: "desc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div>
      <Header
        title="Proposals & Onboarding"
        description="Manage client proposals, onboarding invites, and document imports"
        actions={
          <Link href="/onboard/new">
            <Button>Create New Proposal</Button>
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        <OnboardPageClient
          proposals={proposals.map((p) => ({
            id: p.id,
            token: p.token,
            status: p.status,
            clientName: p.clientName,
            clientEmail: p.clientEmail ?? undefined,
            companyOverview: p.companyOverview,
            packageType: p.packageType,
            setupFee: p.setupFee,
            platformCost: p.platformCost,
            retainerCost: p.retainerCost,
            createdAt: p.createdAt.toISOString(),
          }))}
          onboardingInvites={onboardingInvites.map((inv) => ({
            id: inv.id,
            token: inv.token,
            status: inv.status,
            clientName: inv.clientName,
            clientEmail: inv.clientEmail ?? undefined,
            createWorkspace: inv.createWorkspace,
            workspaceSlug: inv.workspaceSlug ?? undefined,
            createdAt: inv.createdAt.toISOString(),
          }))}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}
