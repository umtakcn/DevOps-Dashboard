import { useEffect, useState } from "react";
import ArgoCDDashboard from "./dashboards/ArgoCDDashboard";
import TektonDashboard from "./dashboards/TektonDashboard";

// Global API_URL değişkeni varsa kullan, yoksa eski davranış (/api/...) çalışır
const API_URL = window.REACT_APP_API_URL ? window.REACT_APP_API_URL : "";

function App() {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/targets`)
      .then(res => res.json())
      .then(data => {
        setTargets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setTargets([]));
  }, []);

  const getTargetByKey = (key) => targets.find(t => (t.type + "_" + t.key) === key);

  if (!selectedTarget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white/90 rounded-2xl shadow-xl p-10 flex flex-col items-center gap-8 min-w-[350px]">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            Ortam Seçin
          </h1>
          <div className="flex flex-col gap-4 w-full">
            {targets.map(target => (
              <button
                key={target.type + "_" + target.key}
                onClick={() => setSelectedTarget(target.type + "_" + target.key)}
                className="py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow hover:scale-105 hover:shadow-lg transition-all"
              >
                {target.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentTarget = getTargetByKey(selectedTarget);

  if (currentTarget?.type === "tekton") {
    return (
      <TektonDashboard
        targetKey={currentTarget.key}
        targetName={currentTarget.name}
        onChangeTarget={() => setSelectedTarget(null)}
        API_URL={API_URL}
      />
    );
  }

  if (currentTarget?.type === "argocd") {
    return (
      <ArgoCDDashboard
        targetKey={currentTarget.key}
        targetName={currentTarget.name}
        onChangeTarget={() => setSelectedTarget(null)}
        API_URL={API_URL}
      />
    );
  }

  return null;
}

export default App;
