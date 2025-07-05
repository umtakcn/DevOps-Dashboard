// components/AppTable.jsx
export default function AppTable({
  apps,
  onRestart,
  onSync,
  paginatedApps,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto rounded-xl overflow-hidden shadow border border-gray-200 bg-white">
        <thead>
          <tr className="bg-gradient-to-r from-indigo-100 to-pink-100">
            <th className="p-4 text-left font-semibold text-gray-700">App</th>
            <th className="p-4 text-left font-semibold text-gray-700">Project</th>
            <th className="p-4 text-left font-semibold text-gray-700">Namespace</th>
            <th className="p-4 text-left font-semibold text-gray-700">Health</th>
            <th className="p-4 text-left font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {paginatedApps.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-400">
                There is no app
              </td>
            </tr>
          ) : (
            paginatedApps.map((app) => (
              <tr key={app.name}>
                <td className="p-4 border-b border-gray-100 text-lg font-medium">
                  {app.name}
                </td>
                <td className="p-4 border-b border-gray-100 text-base text-gray-600">
                  {app.project}
                </td>
                <td className="p-4 border-b border-gray-100 text-base text-gray-600">
                  {app.deploymentNamespace}
                </td>
                <td className="p-4 border-b border-gray-100">
                  <span
                    className={
                      "px-4 py-1 rounded-2xl font-semibold text-sm shadow " +
                      (app.health === "Healthy"
                        ? "bg-green-200 text-green-800"
                        : app.health === "Degraded"
                        ? "bg-red-200 text-red-800"
                        : "bg-yellow-200 text-yellow-800")
                    }
                  >
                    {app.health}
                  </span>
                </td>
                <td className="p-4 border-b border-gray-100 space-x-2">
                  <button
                    onClick={() => onRestart(app)}
                    className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow active:scale-95"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => onSync(app)}
                    className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow active:scale-95"
                  >
                    Sync
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
