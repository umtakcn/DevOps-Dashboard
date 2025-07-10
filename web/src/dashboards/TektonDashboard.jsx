import { useEffect, useState } from "react";

// window.REACT_APP_API_URL varsa onu kullan, yoksa eski davranış (/api)
const API_URL = window.REACT_APP_API_URL ? window.REACT_APP_API_URL : "";

// --- STATUS KARTLARI ---
function TektonStatusCards({ total, succeeded, failed, running, onFilter, selectedStatus }) {
  return (
    <div className="flex flex-row gap-4 justify-center my-4">
      <div
        className={
          "flex flex-col items-center px-6 py-3 rounded-2xl shadow font-semibold text-sm cursor-pointer " +
          (selectedStatus === "ALL"
            ? "ring-2 ring-pink-400 bg-pink-100"
            : "bg-gray-100 hover:bg-pink-50")
        }
        onClick={() => onFilter("ALL")}
      >
        <span className="text-lg font-bold">{total}</span>
        <span className="mt-1">All</span>
      </div>
      <div
        className={
          "flex flex-col items-center px-6 py-3 rounded-2xl shadow font-semibold text-sm cursor-pointer " +
          (selectedStatus === "Succeeded"
            ? "ring-2 ring-green-400 bg-green-100"
            : "bg-green-50 hover:bg-green-100")
        }
        onClick={() => onFilter("Succeeded")}
      >
        <span className="text-lg font-bold">{succeeded}</span>
        <span className="mt-1">Succeeded</span>
      </div>
      <div
        className={
          "flex flex-col items-center px-6 py-3 rounded-2xl shadow font-semibold text-sm cursor-pointer " +
          (selectedStatus === "Failed"
            ? "ring-2 ring-red-400 bg-red-100"
            : "bg-red-50 hover:bg-red-100")
        }
        onClick={() => onFilter("Failed")}
      >
        <span className="text-lg font-bold">{failed}</span>
        <span className="mt-1">Failed</span>
      </div>
      <div
        className={
          "flex flex-col items-center px-6 py-3 rounded-2xl shadow font-semibold text-sm cursor-pointer " +
          (selectedStatus === "Running"
            ? "ring-2 ring-yellow-400 bg-yellow-100"
            : "bg-yellow-50 hover:bg-yellow-100")
        }
        onClick={() => onFilter("Running")}
      >
        <span className="text-lg font-bold">{running}</span>
        <span className="mt-1">Running</span>
      </div>
    </div>
  );
}

// --- TABLE ---
function TektonTable({ runs, loading, onDetail, page, itemsPerPage, totalPages, onPageChange }) {
  if (loading) return <div className="text-center py-10 text-lg">Loading...</div>;
  if (!runs.length) return <div className="text-center py-10 text-lg text-gray-400">There is no PipelineRun.</div>;
  const paginated = runs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto rounded-xl overflow-hidden shadow border border-gray-200 bg-white">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-100 to-pink-100">
              <th className="p-4 text-left font-semibold text-gray-700">Name</th>
              <th className="p-4 text-left font-semibold text-gray-700">Status</th>
              <th className="p-4 text-left font-semibold text-gray-700">Started</th>
              <th className="p-4 text-left font-semibold text-gray-700">Duration</th>
              <th className="p-4 text-left font-semibold text-gray-700">Detail</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(run => {
              const cond = run.status?.conditions?.find(c => c.type === "Succeeded");
              let status = "-";
              if (cond?.status === "True") status = "Succeeded";
              else if (cond?.status === "False") status = "Failed";
              else status = "Running";

              const startTime = run.status?.startTime ? new Date(run.status.startTime) : null;
              const completionTime = run.status?.completionTime ? new Date(run.status.completionTime) : null;
              let duration = "-";
              if (startTime && completionTime) {
                duration = ((completionTime - startTime) / 1000).toFixed(1) + "s";
              } else if (startTime) {
                duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
              }

              return (
                <tr key={run.metadata?.uid}>
                  <td className="p-4 border-b border-gray-100 font-medium">{run.metadata?.name}</td>
                  <td className="p-4 border-b border-gray-100">
                    <span className={
                      "px-4 py-1 rounded-2xl font-semibold text-sm shadow " +
                      (status === "Succeeded"
                        ? "bg-green-200 text-green-800"
                        : status === "Failed"
                        ? "bg-red-200 text-red-800"
                        : "bg-yellow-200 text-yellow-800")
                    }>
                      {status}
                    </span>
                  </td>
                  <td className="p-4 border-b border-gray-100 text-sm font-mono">{startTime ? startTime.toLocaleString() : "-"}</td>
                  <td className="p-4 border-b border-gray-100 text-sm">{duration}</td>
                  <td className="p-4 border-b border-gray-100">
                    <button
                      className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow active:scale-95"
                      onClick={() => onDetail(run)}
                    >Detay</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2 flex-wrap">
          <button
            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-300 text-gray-700 font-semibold"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Previous
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={
                "px-3 py-1 rounded-lg font-semibold " +
                (page === i + 1
                  ? "bg-pink-500 text-white"
                  : "bg-white text-pink-500 border border-pink-300 hover:bg-pink-100")
              }
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-300 text-gray-700 font-semibold"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// --- TASKRUN MODAL ---
function TaskRunModal({ open, run, taskRuns, loading, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white p-6 rounded-xl max-w-2xl w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-4">PipelineRun: {run?.metadata?.name}</h2>
        {loading ? (
          <div>Tasklar yükleniyor...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {taskRuns.map(tr => {
                const cond = tr.status?.conditions?.find(c => c.type === "Succeeded");
                let status = "-";
                if (cond?.status === "True") status = "Succeeded";
                else if (cond?.status === "False") status = "Failed";
                else status = "Running";
                const startTime = tr.status?.startTime ? new Date(tr.status.startTime) : null;
                const completionTime = tr.status?.completionTime ? new Date(tr.status.completionTime) : null;
                let duration = "-";
                if (startTime && completionTime) duration = ((completionTime - startTime) / 1000).toFixed(1) + "s";
                else if (startTime) duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                return (
                  <tr key={tr.metadata?.uid}>
                    <td>{tr.metadata?.name}</td>
                    <td>
                      <span
                        className={
                          "inline-block min-w-[88px] text-center mx-1 px-3 py-1 rounded-xl font-semibold text-xs " +
                          (status === "Succeeded"
                            ? "bg-green-200 text-green-800"
                            : status === "Failed"
                            ? "bg-red-200 text-red-800"
                            : "bg-yellow-200 text-yellow-800")
                        }
                      >
                        {status}
                      </span>
                    </td>
                    <td>{startTime ? startTime.toLocaleString() : "-"}</td>
                    <td>{duration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-pink-500 rounded text-white">Kapat</button>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD ---
function TektonDashboard({ targetKey, targetName, onChangeTarget, API_URL, fetchWithAuth }) {
  const tektonNamespace = "tekton";
  const [tektonRuns, setTektonRuns] = useState([]);
  const [tektonLoading, setTektonLoading] = useState(true);
  const [tektonError, setTektonError] = useState("");
  const [tektonLastUpdate, setTektonLastUpdate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [detailRun, setDetailRun] = useState(null);
  const [taskRuns, setTaskRuns] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchTektonRuns = () => {
    setTektonLoading(true);
    setTektonError("");
    fetchWithAuth(`${API_URL}/api/tekton/pipelineruns?namespace=${tektonNamespace}&target=${targetKey}`)
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("jwt");
          window.location.reload();
          return { items: [] };
        }
        if (!res.ok) throw new Error("Tekton API hatası");
        return res.json();
      })
      .then((data) => {
        setTektonRuns(Array.isArray(data.items) ? data.items : []);
        setTektonLoading(false);
        setTektonLastUpdate(new Date());
      })
      .catch((err) => {
        setTektonError(err.message);
        setTektonRuns([]);
        setTektonLoading(false);
      });
  };

  useEffect(() => {
    fetchTektonRuns();
    const interval = setInterval(fetchTektonRuns, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [targetKey]);

  const filteredRuns = tektonRuns
    .filter(run => {
      const cond = run.status?.conditions?.find(c => c.type === "Succeeded");
      let status = "";
      if (cond?.status === "True") status = "Succeeded";
      else if (cond?.status === "False") status = "Failed";
      else status = "Running";
      if (selectedStatus === "ALL") return true;
      return status === selectedStatus;
    })
    .filter(run => {
      if (!search) return true;
      return (run.metadata?.name || "").toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aStart = a.status?.startTime ? new Date(a.status.startTime).getTime() : 0;
      const bStart = b.status?.startTime ? new Date(b.status.startTime).getTime() : 0;
      return bStart - aStart;
    });

  const tektonStatusCount = {
    Succeeded: tektonRuns.filter(r => r.status?.conditions?.some(c => c.type === "Succeeded" && c.status === "True")).length,
    Failed: tektonRuns.filter(r => r.status?.conditions?.some(c => c.type === "Succeeded" && c.status === "False")).length,
    Running: tektonRuns.filter(r => !(r.status?.conditions?.some(c => c.type === "Succeeded"))).length,
  };

  useEffect(() => { setPage(1); }, [selectedStatus, search]);

  const openDetail = (run) => {
    setDetailRun(run);
    setTaskRuns([]);
    setTaskLoading(true);
    fetchWithAuth(`${API_URL}/api/tekton/taskruns?namespace=${tektonNamespace}&pipelineRunName=${run.metadata.name}&target=${targetKey}`)
      .then(res => res.json())
      .then(data => {
        setTaskRuns(data.items || []);
        setTaskLoading(false);
      });
  };

  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow bg-white/70 rounded-2xl px-8 py-4 mt-10 mb-4 text-center shadow-lg">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">
          {targetName}
        </span>
      </h1>
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 flex flex-col gap-4">
        <div className="flex flex-col items-center w-full">
          <div className="flex w-full items-center justify-end">
            <button
              onClick={onChangeTarget}
              className="px-4 py-1 rounded-lg bg-pink-100 text-pink-700 font-semibold shadow hover:bg-pink-200 transition-all"
            >
              Ortam Değiştir
            </button>
          </div>
          <TektonStatusCards
            total={tektonRuns.length}
            succeeded={tektonStatusCount.Succeeded}
            failed={tektonStatusCount.Failed}
            running={tektonStatusCount.Running}
            onFilter={setSelectedStatus}
            selectedStatus={selectedStatus}
          />
        </div>
        <div className="flex flex-row justify-between items-center mb-4 w-full gap-2">
          <div className="text-sm text-gray-600 flex-1">
            <b>Last Update:</b>{" "}
            <span className="font-mono">
              {tektonLastUpdate
                ? tektonLastUpdate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : "-"}
            </span>
          </div>
          <input
            type="text"
            placeholder="PipelineRun ismi ara..."
            className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: 120 }}
          />
          <button
            onClick={fetchTektonRuns}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition text-white font-semibold text-sm shadow active:scale-95 ml-2"
            disabled={tektonLoading}
          >
            {tektonLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {tektonError && (
          <div className="text-red-600 bg-red-50 p-4 rounded-xl text-center font-semibold mb-4">
            {tektonError}
          </div>
        )}
        <TektonTable
          runs={filteredRuns}
          loading={tektonLoading}
          onDetail={openDetail}
          page={page}
          itemsPerPage={itemsPerPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        <footer className="mt-8 text-sm text-gray-500 text-center opacity-70">
          <span>Made by <b>Noldor</b> | Go & React Project</span>
        </footer>
        <TaskRunModal
          open={!!detailRun}
          run={detailRun}
          taskRuns={taskRuns}
          loading={taskLoading}
          onClose={() => setDetailRun(null)}
        />
      </div>
    </div>
  );
}

export default TektonDashboard;
