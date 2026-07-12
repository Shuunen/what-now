export function Status({ error, info, progress }: { error?: string; info?: string; progress?: string }) {
  return (
    <div className="my-1 flex flex-col" data-testid="status">
      <div className="font-bold text-red-500">{error}</div>
      <div className={`transition-colors ease-in-out ${info ? 'text-inherit' : 'text-transparent'}`}>{info}</div>
      <div className="text-lg font-light text-white/60 italic">{progress}</div>
    </div>
  )
}
