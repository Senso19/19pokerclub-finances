export default function StatCard({ label, value, sub, tone = 'default', icon: Icon }) {
  const toneClasses = {
    default: 'text-ink',
    good: 'text-chip-blue',
    bad: 'text-chip-red',
    gold: 'text-chip-gold',
  }
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-2 min-w-[160px]">
      <div className="flex items-center justify-between text-ink/50">
        <span className="text-xs uppercase tracking-widest font-semibold">{label}</span>
        {Icon && <Icon size={16} strokeWidth={2} />}
      </div>
      <div className={`font-mono text-2xl font-bold tabular-nums ${toneClasses[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-ink/40">{sub}</div>}
    </div>
  )
}
