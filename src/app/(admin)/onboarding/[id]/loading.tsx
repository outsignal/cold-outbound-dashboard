import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

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
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </header>
      <div className="p-8 max-w-4xl space-y-6">
        {/* Status timeline */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Detail cards */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
