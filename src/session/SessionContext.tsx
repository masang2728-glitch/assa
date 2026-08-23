import React, { createContext, useContext, useEffect, useState } from "react";
import { ADMIN_PIN, type Part } from "../constants";

const NAME_KEY = "assa:name";
const PART_KEY = "assa:part";
const ADMIN_KEY = "assa:isAdmin";

interface SessionContextValue {
  name: string | null;
  part: Part | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (name: string, part: Part, pin: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<string | null>(null);
  const [part, setPart] = useState<Part | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY));
    setPart(localStorage.getItem(PART_KEY) as Part | null);
    setIsAdmin(localStorage.getItem(ADMIN_KEY) === "true");
    setIsLoading(false);
  }, []);

  const login = (inputName: string, inputPart: Part, pin: string) => {
    const trimmedName = inputName.trim();
    const trimmedPin = pin.trim();

    if (trimmedPin.length > 0 && trimmedPin !== ADMIN_PIN) {
      return { ok: false as const, error: "관리자 암호가 올바르지 않습니다." };
    }
    const admin = trimmedPin.length > 0 && trimmedPin === ADMIN_PIN;

    localStorage.setItem(NAME_KEY, trimmedName);
    localStorage.setItem(PART_KEY, inputPart);
    localStorage.setItem(ADMIN_KEY, admin ? "true" : "false");
    setName(trimmedName);
    setPart(inputPart);
    setIsAdmin(admin);
    return { ok: true as const };
  };

  const logout = () => {
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(PART_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setName(null);
    setPart(null);
    setIsAdmin(false);
  };

  return (
    <SessionContext.Provider value={{ name, part, isAdmin, isLoading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
