import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  findDriverForUser,
  linkDriverToAuthUser,
  registerDriverProfile,
  subscribe,
  subscribeDriverAssignments,
  type DriverRegistrationInput,
} from "@/lib/repo";
import { paths } from "@/lib/paths";
import { log, logError } from "@/lib/log";
import type { Driver, DriverAssignment } from "@/types/forkfleet";

interface AuthDriverState {
  ready: boolean;
  user: User | null;
  driver: Driver | null;
  assignments: DriverAssignment[];
  activeAssignments: DriverAssignment[];
  profileMissing: boolean;
  error: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (input: DriverRegistrationInput & { password: string }) => Promise<void>;
  createMissingProfile: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}


const Ctx = createContext<AuthDriverState | null>(null);

export function AuthDriverProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      if (cancelled) return;
      setUser(u);
      if (!u) {
        setDriver(null);
        setAssignments([]);
        setProfileMissing(false);
        setReady(true);
        return;
      }
      try {
        log("AUTH", `firebase user authenticated: ${u.uid}`);
        const found = await findDriverForUser(u.uid, u.email);
        if (cancelled) return;
        if (!found) {
          setProfileMissing(true);
          setDriver(null);
        } else {
          setProfileMissing(false);
          setDriver(found);
          log("AUTH", `Driver authenticated: ${found.id}`);
          if (found.user_id !== u.uid) {
            linkDriverToAuthUser(found.id, u.uid).catch((e) =>
              logError("AUTH", "could not link driver to auth user", e),
            );
          }
        }
      } catch (e) {
        logError("AUTH", "driver resolution failed", e);
        setError((e as Error).message);
      } finally {
        if (!cancelled) setReady(true);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  // Realtime driver profile
  useEffect(() => {
    if (!driver?.id) return;
    const id = driver.id;
    const unsub = subscribe<Driver>(paths.driver(id), (d) => {
      if (d) setDriver({ ...d, id: d.id ?? id });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  // Realtime assignments
  useEffect(() => {
    if (!driver?.id) {
      setAssignments([]);
      return;
    }
    const unsub = subscribeDriverAssignments(driver.id, setAssignments);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  const value = useMemo<AuthDriverState>(
    () => ({
      ready,
      user,
      driver,
      assignments,
      activeAssignments: assignments.filter((a) => a.is_active),
      profileMissing,
      error,
      login: async (email, password, remember) => {
        const auth = getFirebaseAuth();
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      register: async ({ password, ...input }) => {
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), password);
        await updateProfile(cred.user, { displayName: input.full_name.trim() });
        const created = await registerDriverProfile(cred.user.uid, input);
        setDriver(created);
        setProfileMissing(false);
        sendEmailVerification(cred.user).catch((e) =>
          logError("AUTH", "verification email failed", e),
        );
        log("AUTH", `driver registered: ${cred.user.uid}`);
      },

      createMissingProfile: async () => {
        const u = getFirebaseAuth().currentUser;
        if (!u) throw new Error("You are not signed in.");
        const created = await registerDriverProfile(u.uid, {
          full_name: u.displayName || (u.email ?? "").split("@")[0] || "Driver",
          email: u.email ?? "",
          phone: u.phoneNumber ?? "",
        });
        setDriver(created);
        setProfileMissing(false);
      },
      logout: async () => {
        await signOut(getFirebaseAuth());
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      },
      resendVerification: async () => {
        const u = getFirebaseAuth().currentUser;
        if (u) await sendEmailVerification(u);
      },
    }),
    [ready, user, driver, assignments, profileMissing, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthDriver() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthDriver must be used inside AuthDriverProvider");
  return ctx;
}
