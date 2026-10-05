import { SkeletonCard } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard className="h-[280px]" />
        <SkeletonCard className="h-[280px]" />
        <SkeletonCard className="h-[280px]" />
        <SkeletonCard className="h-[280px]" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SkeletonCard className="h-[248px]" />
        <SkeletonCard className="h-[248px]" />
      </div>
    </div>
  );
}
