export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <div className="absolute font-bold text-xs tracking-wider text-amber-400">FD</div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400 animate-pulse">
        Loading Founders Den...
      </p>
    </div>
  );
}
