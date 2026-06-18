export default function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
          <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
