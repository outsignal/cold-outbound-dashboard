import { Skeleton } from "@/components/ui/skeleton";

export default function LinkedInLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
