import { useState } from "react";

const API_URL = window.REACT_APP_API_URL ? window.REACT_APP_API_URL : "";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("jwt", data.token);
        onLogin(data.token);
      } else {
        setError(data.error || "Kullanıcı adı ya da şifre hatalı");
      }
    } catch (err) {
      setError("Sunucuya ulaşılamıyor");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl shadow-xl p-10 flex flex-col items-center gap-6 min-w-[350px]">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Giriş Yap
        </h1>
        <input
          className="px-4 py-3 rounded-xl border border-gray-300 w-full"
          placeholder="Kullanıcı adı"
          autoFocus
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
        />
        <input
          className="px-4 py-3 rounded-xl border border-gray-300 w-full"
          placeholder="Şifre"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
        />
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        <button
          className="py-3 rounded-xl bg-indigo-500 text-white font-bold w-full hover:bg-indigo-600 transition-all"
          type="submit"
          disabled={loading}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
