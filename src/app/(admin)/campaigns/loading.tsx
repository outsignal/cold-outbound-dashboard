import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div>
      <header className="border-b border-border/50 px-8 py-5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-56 mt-1" />
      </header>
      <div className="p-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
