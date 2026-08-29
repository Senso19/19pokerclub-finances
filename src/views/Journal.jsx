import TransactionTable from '../components/TransactionTable'

export default function Journal({ ecritures, categories, onAdd, onEdit, editMode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-felt">Journal d'enregistrement</h2>
        <p className="text-sm text-ink/50 mt-1">Toutes les écritures, banque et caisse confondues.</p>
      </div>
      <TransactionTable
        ecritures={ecritures}
        categories={categories}
        onAdd={() => onAdd('banque')}
        onEdit={onEdit}
        editMode={editMode}
      />
    </div>
  )
}
