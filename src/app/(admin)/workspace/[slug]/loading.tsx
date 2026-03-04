import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-8 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-8 py-5">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>
      <div className="p-8 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {/* Tabs */}
        <Skeleton className="h-10 w-64 rounded" />
        {/* Table */}
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
