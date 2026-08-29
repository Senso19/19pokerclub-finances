import { eur } from '../lib/format'

// Dénominations façon jetons de poker : chaque tranche de valeur change la
// couleur du jeton, comme une vraie table. C'est l'élément signature de
// l'appli : la trésorerie du club rendue comme une vraie pile de jetons.
const DENOMINATIONS = [
  { max: 500, color: '#F7F3E8', ring: '#C7BFA8', label: '5' },
  { max: 2000, color: '#C1443C', ring: '#7E241F', label: '25' },
  { max: 5000, color: '#2C5F8A', ring: '#173A56', label: '100' },
  { max: 10000, color: '#4A8B5C', ring: '#245631', label: '500' },
  { max: Infinity, color: '#1A1A1A', ring: '#000000', label: '1K' },
]

function denomFor(value) {
  return DENOMINATIONS.find((d) => value <= d.max) || DENOMINATIONS[DENOMINATIONS.length - 1]
}

export default function ChipStack({ value = 0, label = 'Trésorerie totale', size = 'lg' }) {
  const abs = Math.max(0, Math.round(value))
  // nombre de jetons à l'écran : échelle douce (racine) pour rester lisible
  const count = Math.min(14, Math.max(3, Math.round(Math.sqrt(abs / 40))))
  const chipH = size === 'lg' ? 20 : 14
  const chipW = size === 'lg' ? 96 : 68
  const chips = Array.from({ length: count })
  const perChipValue = abs / count

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex flex-col-reverse items-center"
        style={{ height: chipH * count + 24, width: chipW + 16 }}
        role="img"
        aria-label={`Pile symbolisant ${eur(value)}`}
      >
        {chips.map((_, i) => {
          const d = denomFor(perChipValue * (i + 1))
          return (
            <div
              key={i}
              className="absolute rounded-chip border-4 shadow-chip motion-safe:animate-[chipDrop_0.5s_ease-out_backwards]"
              style={{
                width: chipW,
                height: chipH,
                bottom: i * (chipH * 0.62),
                backgroundColor: d.color,
                borderColor: d.ring,
                animationDelay: `${i * 60}ms`,
                zIndex: i,
              }}
            >
              <div
                className="absolute inset-0 rounded-chip"
                style={{
                  backgroundImage: `repeating-conic-gradient(${d.ring} 0deg 8deg, transparent 8deg 30deg)`,
                  opacity: 0.5,
                }}
              />
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes chipDrop {
          from { transform: translateY(-18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="text-center">
        <div className="font-mono text-3xl md:text-4xl font-bold tabular-nums text-ink">{eur(value)}</div>
        <div className="text-xs uppercase tracking-widest text-ink/50 mt-1">{label}</div>
      </div>
    </div>
  )
}
