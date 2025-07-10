import { useEffect, useState } from "react";
import StatusCards from "../components/StatusCards";
import AppTable from "../components/AppTable";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

// window.REACT_APP_API_URL varsa kullan, yoksa ""
const API_URL = window.REACT_APP_API_URL ? window.REACT_APP_API_URL : "";

function ArgoCDDashboard({ targetKey, targetName, onChangeTarget, API_URL, fetchWithAuth }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const [selectedNamespace, setSelectedNamespace] = useState("ALL");
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [selectedHealth, setSelectedHealth] = useState("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({});
  const [toast, setToast] = useState({ open: false, type: "success", message: "" });

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
    setTimeout(() => setToast({ open: false, type: "", message: "" }), 2500);
  };

  const fetchApps = () => {
    setLoading(true);
    fetchWithAuth(`${API_URL}/api/apps?target=${targetKey}`)
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("jwt");
          window.location.reload();
          return [];
        }
        if (!res.ok) throw new Error("API hatası");
        return res.json();
      })
      .then((data) => {
        setApps(Array.isArray(data) ? data : []);
        setLoading(false);
        setError("");
        setLastUpdate(new Date());
      })
      .catch((err) => {
        setApps([]);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [targetKey]);

  // Projects ve Namespaces
  const projects = Array.from(new Set(apps.map((app) => app.project))).filter(Boolean);
  const namespaces = Array.from(
    new Set(
      apps
        .filter(app => selectedProject === "ALL" || app.project === selectedProject)
        .map(app => app.deploymentNamespace)
    )
  ).filter(Boolean);

  // Filtreleme
  const filteredApps = apps.filter(
    (app) =>
      (selectedProject === "ALL" || app.project === selectedProject) &&
      (selectedNamespace === "ALL" || app.deploymentNamespace === selectedNamespace) &&
      (selectedHealth === "ALL" || app.health === selectedHealth) &&
      (search === "" || app.name.toLowerCase().includes(search.toLowerCase()))
  );
  const sortedApps = filteredApps.sort((a, b) => a.name.localeCompare(b.name));
  const totalPages = Math.ceil(sortedApps.length / itemsPerPage);
  const paginatedApps = sortedApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statü sayıları (StatusCards için)
  const totalAppCount = filteredApps.length;
  const healthyCount = filteredApps.filter(app => app.health === "Healthy").length;
  const degradedCount = filteredApps.filter(app => app.health === "Degraded").length;
  const progressingCount = filteredApps.filter(app => app.health === "Progressing").length;
  const missingCount = filteredApps.filter(app => app.health === "Missing").length;
  const unknownCount = filteredApps.filter(app => app.health === "Unknown").length;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedNamespace, selectedProject, selectedHealth, search]);

  // Onay modalları
  const askRestart = (app) => {
    setConfirmData({ action: "restart", app });
    setConfirmOpen(true);
  };
  const askSync = (app) => {
    setConfirmData({ action: "sync", app });
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (confirmData.action === "restart") {
      const app = confirmData.app;
      fetchWithAuth(`${API_URL}/api/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: app.name,
          deploymentName: app.deploymentName,
          deploymentNamespace: app.deploymentNamespace,
          target: targetKey,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.result) {
            showToast("success", data.result);
          } else {
            showToast("error", data.error || "Bilinmeyen hata!");
          }
        })
        .catch(() => showToast("error", "Bağlantı hatası!"));
    } else if (confirmData.action === "sync") {
      const app = confirmData.app;
      fetchWithAuth(`${API_URL}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: app.name,
          target: targetKey,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.result) {
            showToast("success", data.result);
          } else {
            showToast("error", data.error || "Bilinmeyen hata!");
          }
        })
        .catch(() => showToast("error", "Bağlantı hatası!"));
    }
  };

  const formatTime = (date) => {
    if (!date) return "-";
    return date.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* BAŞLIK KUTUCUĞU */}
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow bg-white/70 rounded-2xl px-8 py-4 mt-10 mb-4 text-center shadow-lg">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">
          {targetName}
        </span>
      </h1>
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 flex flex-row gap-6">
        {/* Sol Project Tabs */}
        <div className="w-48 flex flex-col gap-2">
          <button
            onClick={() => { setSelectedProject("ALL"); setSelectedNamespace("ALL"); }}
            className={
              "px-4 py-2 rounded-xl font-semibold text-sm shadow " +
              (selectedProject === "ALL"
                ? "bg-pink-500 text-white"
                : "bg-white text-pink-500 border border-pink-300 hover:bg-pink-50")
            }
          >
            All Projects
          </button>
          {projects.map((p) => (
            <button
              key={p}
              onClick={() => { setSelectedProject(p); setSelectedNamespace("ALL"); }}
              className={
                "px-4 py-2 rounded-xl font-semibold text-sm shadow text-left " +
                (selectedProject === p
                  ? "bg-pink-500 text-white"
                  : "bg-white text-pink-500 border border-pink-300 hover:bg-pink-50")
              }
            >
              {p}
            </button>
          ))}
        </div>
        {/* Sağ ana alan */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-2 justify-end">
            <button
              onClick={onChangeTarget}
              className="px-4 py-1 rounded-lg bg-pink-100 text-pink-700 font-semibold shadow hover:bg-pink-200 transition-all"
            >
              Ortam Değiştir
            </button>
          </div>
          {/* Status kutucukları */}
          <StatusCards
            total={totalAppCount}
            healthy={healthyCount}
            degraded={degradedCount}
            progressing={progressingCount}
            missing={missingCount}
            unknown={unknownCount}
            onFilter={setSelectedHealth}
            selectedHealth={selectedHealth}
          />

          {/* === Namespace Dropdown === */}
          <div className="flex items-center gap-2 mb-4">
            <label className="font-semibold text-sm">Namespace:</label>
            <select
              className="px-3 py-2 rounded-xl border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm bg-white"
              value={selectedNamespace}
              onChange={e => setSelectedNamespace(e.target.value)}
              style={{ minWidth: 160, maxWidth: 280 }}
            >
              <option value="ALL">All Namespaces</option>
              {namespaces.map(ns => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>
          {/* === Namespace Dropdown sonu === */}

          {/* Arama ve yenile butonu */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-2">
            <div className="text-sm text-gray-600">
              <b>Last Update:</b> <span className="font-mono">{formatTime(lastUpdate)}</span>
            </div>
            <input
              type="text"
              placeholder="Search"
              className="px-3 py-2 rounded-xl border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <button
              onClick={fetchApps}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition text-white font-semibold text-sm shadow active:scale-95"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {error && (
            <div className="text-red-600 bg-red-50 p-4 rounded-xl text-center font-semibold mb-4">
              {error}
            </div>
          )}
          {/* AppTable */}
          <AppTable
            apps={apps}
            paginatedApps={paginatedApps}
            onRestart={askRestart}
            onSync={askSync}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2 flex-wrap">
              <button
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-300 text-gray-700 font-semibold"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                ← Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={
                    "px-3 py-1 rounded-lg font-semibold " +
                    (currentPage === i + 1
                      ? "bg-pink-500 text-white"
                      : "bg-white text-pink-500 border border-pink-300 hover:bg-pink-100")
                  }
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-300 text-gray-700 font-semibold"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next →
              </button>
            </div>
          )}
          <footer className="mt-8 text-sm text-gray-500 text-center opacity-70">
            <span>Made by <b>Noldor</b> | Go & React Project</span>
          </footer>
        </div>
      </div>
      <Toast open={toast.open} type={toast.type} message={toast.message} />
      <ConfirmModal
        open={confirmOpen}
        title={
          confirmData.action === "restart"
            ? "Restart Confirmation"
            : confirmData.action === "sync"
            ? "Sync Confirmation"
            : ""
        }
        message={
          confirmData.action === "restart" && confirmData.app
            ? `Do you want to restart ${confirmData.app.deploymentName}?`
            : confirmData.action === "sync" && confirmData.app
            ? `Do you want to sync ${confirmData.app.name}?`
            : ""
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default ArgoCDDashboard;
