// components/StatusCards.jsx
export default function StatusCards({
  total,
  healthy,
  degraded,
  progressing,
  missing,
  unknown,
  onFilter,
  selectedHealth
}) {
  const statuses = [
    { label: "All", count: total, color: "from-gray-200 to-gray-100", value: "ALL" },
    { label: "Healthy", count: healthy, color: "from-green-300 to-green-100", value: "Healthy" },
    { label: "Degraded", count: degraded, color: "from-red-300 to-red-100", value: "Degraded" },
    { label: "Progressing", count: progressing, color: "from-yellow-200 to-yellow-100", value: "Progressing" },
    { label: "Missing", count: missing, color: "from-pink-200 to-pink-100", value: "Missing" },
    { label: "Unknown", count: unknown, color: "from-indigo-200 to-indigo-100", value: "Unknown" },
  ];

  return (
    <div className="flex flex-row gap-4 flex-wrap mb-6 justify-center">
      {statuses.map(s => (
        <div
          key={s.label}
          onClick={() => onFilter(s.value)}
          className={
            "cursor-pointer flex flex-col items-center px-6 py-3 rounded-2xl shadow transition-all font-semibold text-sm select-none " +
            (selectedHealth === s.value
              ? "ring-2 ring-pink-400 ring-inset scale-105"
              : "opacity-90 hover:opacity-100 hover:scale-105") +
            ` bg-gradient-to-br ${s.color}`
          }
        >
          <span className="text-lg font-bold">{s.count}</span>
          <span className="mt-1">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
