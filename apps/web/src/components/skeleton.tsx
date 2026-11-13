export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden p-4" aria-hidden>
      <div className="skeleton aspect-square w-full" />
      <div className="skeleton mt-4 h-4 w-3/4" />
      <div className="skeleton mt-2 h-4 w-1/2" />
      <div className="skeleton mt-4 h-6 w-1/3" />
      <div className="skeleton mt-4 h-9 w-full" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-6" aria-hidden>
      <div className="skeleton h-5 w-40" />
      <div className="skeleton mt-6 h-64 w-full" />
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8" aria-hidden>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="skeleton aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-12 w-1/2" />
        </div>
      </div>
      <div className="mt-8"><ChartSkeleton /></div>
    </div>
  );
}
