export default function Toast({ open, type, message }) {
  if (!open) return null;
  return (
    <div
      className={
        "fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-xl font-semibold text-sm transition-all " +
        (type === "success"
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white")
      }
      style={{ minWidth: 200, textAlign: "center" }}
    >
      {message}
    </div>
  );
}