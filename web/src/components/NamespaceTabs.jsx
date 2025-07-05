// components/NamespaceTabs.jsx
export default function NamespaceTabs({
  namespaces,
  selectedNamespace,
  onSelect,
}) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      <button
        onClick={() => onSelect("ALL")}
        className={
          "px-4 py-2 rounded-xl font-semibold text-sm shadow " +
          (selectedNamespace === "ALL"
            ? "bg-indigo-500 text-white"
            : "bg-white text-indigo-500 border border-indigo-300 hover:bg-indigo-50")
        }
      >
        All Namespaces
      </button>
      {namespaces.map((ns) => (
        <button
          key={ns}
          onClick={() => onSelect(ns)}
          className={
            "px-4 py-2 rounded-xl font-semibold text-sm shadow " +
            (selectedNamespace === ns
              ? "bg-indigo-500 text-white"
              : "bg-white text-indigo-500 border border-indigo-300 hover:bg-indigo-50")
          }
        >
          {ns}
        </button>
      ))}
    </div>
  );
}
