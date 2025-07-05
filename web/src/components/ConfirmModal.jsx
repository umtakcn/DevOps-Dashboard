export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xs flex flex-col gap-4 items-center">
        <div className="text-xl font-semibold text-gray-800 text-center">{title}</div>
        <div className="text-gray-600 text-center">{message}</div>
        <div className="flex gap-4 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
