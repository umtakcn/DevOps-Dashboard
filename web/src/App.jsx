import { useState, useEffect } from "react";
import Login from "./Login";
import ArgoCDDashboard from "./dashboards/ArgoCDDashboard";
import TektonDashboard from "./dashboards/TektonDashboard";

const API_URL = window.REACT_APP_API_URL ? window.REACT_APP_API_URL : "";

// JWT token eklemek için yardımcı fetch fonksiyonu
const fetchWithAuth = (url, options = {}) => {
  const token = localStorage.getItem("jwt");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt") || null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Login kontrolü
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchWithAuth(`${API_URL}/api/targets`)
      .then(res => {
        if (res.status === 401) {
          setToken(null);
          localStorage.removeItem("jwt");
          return [];
        }
        return res.json();
      })
      .then(data => {
        setTargets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setTargets([]));
  }, [token]);

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  // Giriş yaptıktan sonra ortam seçimi
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
            <button
              onClick={() => {
                setToken(null);
                localStorage.removeItem("jwt");
              }}
              className="py-2 mt-2 rounded-xl text-base font-semibold bg-gray-200 text-gray-700 shadow hover:bg-gray-300 transition-all"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getTargetByKey = (key) => targets.find(t => (t.type + "_" + t.key) === key);
  const currentTarget = getTargetByKey(selectedTarget);

  if (currentTarget?.type === "tekton") {
    return (
      <TektonDashboard
        targetKey={currentTarget.key}
        targetName={currentTarget.name}
        onChangeTarget={() => setSelectedTarget(null)}
        API_URL={API_URL}
        fetchWithAuth={fetchWithAuth}
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
        fetchWithAuth={fetchWithAuth}
      />
    );
  }

  return null;
}

export default App;
