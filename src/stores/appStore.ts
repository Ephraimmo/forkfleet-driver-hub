import { create } from "zustand";
import type { GeoPoint } from "@/lib/geo";

interface AppState {
  online: boolean; // driver duty status
  connected: boolean; // network/firebase connectivity
  position: GeoPoint | null;
  positionError: string | null;
  activeOrderId: string | null;
  setOnline: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setPosition: (p: GeoPoint | null) => void;
  setPositionError: (e: string | null) => void;
  setActiveOrderId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  online: false,
  connected: true,
  position: null,
  positionError: null,
  activeOrderId: null,
  setOnline: (v) => set({ online: v }),
  setConnected: (v) => set({ connected: v }),
  setPosition: (p) => set({ position: p }),
  setPositionError: (e) => set({ positionError: e }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
}));
