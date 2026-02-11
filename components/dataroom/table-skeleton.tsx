import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  showLocationColumn?: boolean;
  showCheckbox?: boolean;
}

export function TableSkeleton({ rows = 5, showLocationColumn = false, showCheckbox = false }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {showCheckbox && (
            <TableHead className="w-10">
              <Skeleton className="h-4 w-4 rounded-sm" />
            </TableHead>
          )}
          <TableHead className={showCheckbox ? "w-[40%]" : ""}>
            <Skeleton className="h-4 w-20" />
          </TableHead>
          {showLocationColumn && (
            <TableHead className="w-[140px] max-w-[140px]">
              <Skeleton className="h-4 w-20" />
            </TableHead>
          )}
          <TableHead>
            <Skeleton className="h-4 w-24" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-4 w-24" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-4 w-16" />
          </TableHead>
          <TableHead className="w-12">
            <Skeleton className="h-4 w-4" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            {showCheckbox && (
              <TableCell>
                <Skeleton className="h-4 w-4 rounded-sm" />
              </TableCell>
            )}
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  {i === 0 && <Skeleton className="h-3 w-24" />}
                </div>
              </div>
            </TableCell>
            {showLocationColumn && (
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-8 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
