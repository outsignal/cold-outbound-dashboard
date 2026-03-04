import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-36" />
      {/* Header card */}
      <Skeleton className="h-36 rounded-lg" />
      {/* Leads card */}
      <Skeleton className="h-64 rounded-lg" />
      {/* Content card */}
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
