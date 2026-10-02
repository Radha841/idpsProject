import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("idps_user")) || null; } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem("idps_user", JSON.stringify(user));
    else localStorage.removeItem("idps_user");
  }, [user]);

  async function login(username, password) {
    const data = await apiLogin(username, password);
    localStorage.setItem("idps_token", data.access_token || data.token);
    const nextUser = data.user || { username, role: "analyst" };
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("idps_token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
