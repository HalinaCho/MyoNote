interface Props {
  message: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ message, action }: Props) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
      <p className="text-sm text-gray-400">{message}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 text-sm text-teal-600 font-medium">
          {action.label}
        </button>
      )}
    </div>
  )
}
