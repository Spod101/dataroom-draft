import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface GridSkeletonProps {
  items?: number;
}

export function GridSkeleton({ items = 8 }: GridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="border-primary/20 overflow-hidden">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="mt-auto space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
