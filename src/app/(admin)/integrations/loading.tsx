import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div>
      <header className="flex items-center justify-between border-b border-border/50 px-8 py-5">
        <div className="space-y-1">
          <div className="h-7 w-36 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </header>
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} density="compact">
              <CardContent>
                <div className="h-3 bg-muted rounded w-24 mb-3 animate-pulse" />
                <div className="h-8 bg-muted rounded w-12 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} density="compact">
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2.5 w-2.5 bg-muted rounded-full animate-pulse" />
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
