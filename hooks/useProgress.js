"use client"; // Hook con estado, efectos, localStorage y Firebase: solo existe en el navegador.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { HOUSE_IDS } from "@/data/houses";
import { ITEM_IDS, PLACE_IDS } from "@/data/places";
import { SPELL_IDS } from "@/data/spells";
import { WAND_IDS } from "@/data/wands";
import { getFirebaseServices, hasFirebaseConfig } from "@/lib/firebase";

const STORAGE_KEY = "tp6-hogwarts-progress";
const FINAL_ITEM = "camara-abierta";

const EMPTY_PROGRESS = Object.freeze({
  house: null,
  wand: null,
  spells: [],
  items: [],
  currentPlace: null,
  ending: null,
});

function pickId(value, validIds) {
  return validIds.has(value) ? value : null;
}

function pickIds(value, validIds) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => validIds.has(id)))];
}

// Acepta el formato actual y los de la Fase 1: un array suelto en
// localStorage o un documento de Firestore con `clues` en lugar de `items`.
// ending no se lee: se deriva de la casa cuando la Cámara está abierta, así
// siempre cumple lo que exige firestore.rules.
function normalizeProgress(raw) {
  if (Array.isArray(raw)) return { ...EMPTY_PROGRESS, items: pickIds(raw, ITEM_IDS) };
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROGRESS };

  const house = pickId(raw.house, HOUSE_IDS);
  const items = pickIds(raw.items ?? raw.clues, ITEM_IDS);

  return {
    house,
    wand: pickId(raw.wand, WAND_IDS),
    spells: pickIds(raw.spells, SPELL_IDS),
    items,
    currentPlace: pickId(raw.currentPlace, PLACE_IDS),
    ending: items.includes(FINAL_ITEM) ? house : null,
  };
}

// Al iniciar sesión: los valores únicos priorizan lo remoto y las listas se unen.
function mergeProgress(local, remote) {
  return normalizeProgress({
    house: remote.house ?? local.house,
    wand: remote.wand ?? local.wand,
    spells: [...local.spells, ...remote.spells],
    items: [...local.items, ...remote.items],
    currentPlace: remote.currentPlace ?? local.currentPlace,
  });
}

function sameProgress(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readLocal() {
  try {
    return normalizeProgress(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"),
    );
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function saveLocal(progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getProvider(user) {
  if (user.isAnonymous) return "anonymous";
  return user.providerData[0]?.providerId || "password";
}

// Se escribe el documento completo, sin merge: así un documento viejo pierde
// el campo clues y queda solo con las claves que permite firestore.rules.
function toProgressDoc(user, progress) {
  return {
    userId: user.uid,
    authProvider: getProvider(user),
    ...progress,
    updatedAt: serverTimestamp(),
  };
}

// OFFLINE se detecta con navigator.onLine y los eventos online/offline del navegador.
function subscribeConnection(onChange) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getOnline = () => navigator.onLine;
const getServerOnline = () => true;

async function saveUserProfile(user, db) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const profile = {
    userId: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    isAnonymous: user.isAnonymous,
    authProvider: getProvider(user),
    lastLoginAt: serverTimestamp(),
  };

  if (!snapshot.exists()) profile.createdAt = serverTimestamp();
  await setDoc(userRef, profile, { merge: true });
}

export function useProgress() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const progressRef = useRef(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  // settled: ya se sabe el progreso definitivo (sin Firebase, apenas se lee
  // el local; con Firebase, cuando termina el primer intento de sincronizar).
  const [settled, setSettled] = useState(false);
  const [syncState, setSyncState] = useState("local");
  const [remoteUser, setRemoteUser] = useState(null);
  const remoteUserRef = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const online = useSyncExternalStore(
    subscribeConnection,
    getOnline,
    getServerOnline,
  );

  useEffect(() => {
    const localProgress = readLocal();
    progressRef.current = localProgress;

    const hydrateLocal = window.setTimeout(() => {
      setProgress(localProgress);
      saveLocal(localProgress);
      setReady(true);
      if (!hasFirebaseConfig) setSettled(true);
    }, 0);

    if (!hasFirebaseConfig) return () => window.clearTimeout(hydrateLocal);

    // Sin respuesta de Firebase (sin red, por ejemplo) no se espera para siempre.
    const giveUp = window.setTimeout(() => setSettled(true), 4000);
    const { auth, db } = getFirebaseServices();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        remoteUserRef.current = null;
        setRemoteUser(null);
        setAuthUser(null);
        try {
          setSyncState("connecting");
          await signInAnonymously(auth);
        } catch (error) {
          console.warn("No se pudo iniciar la sesion anonima.", error);
          setAuthError(error.code || "auth/anonymous-sign-in-failed");
          setSyncState("local");
          setSettled(true);
        }
        return;
      }

      try {
        setSyncState("connecting");
        await saveUserProfile(user, db);

        const snapshot = await getDoc(doc(db, "progress", user.uid));
        const remoteProgress = normalizeProgress(
          snapshot.exists() ? snapshot.data() : null,
        );
        const mergedProgress = mergeProgress(progressRef.current, remoteProgress);

        progressRef.current = mergedProgress;
        setProgress(mergedProgress);
        saveLocal(mergedProgress);
        remoteUserRef.current = user;
        setRemoteUser(user);
        setAuthUser(user);
        setAuthError("");
        setSyncState("cloud");
      } catch (error) {
        console.warn("No se pudo sincronizar con Firebase.", error);
        setAuthUser(user);
        setAuthError(error.code || "firestore/sync-failed");
        setSyncState("local");
      } finally {
        setSettled(true);
      }
    });

    return () => {
      window.clearTimeout(hydrateLocal);
      window.clearTimeout(giveUp);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !remoteUser) return;
    const { db } = getFirebaseServices();
    setDoc(
      doc(db, "progress", remoteUser.uid),
      toProgressDoc(remoteUser, progress),
    ).catch((error) => console.warn("No se pudo sincronizar el progreso.", error));
  }, [progress, ready, remoteUser]);

  // Aplica un cambio sobre el progreso más reciente (no el del último render),
  // así varias llamadas seguidas no se pisan.
  const update = useCallback((change) => {
    const next = normalizeProgress(change(progressRef.current));
    if (sameProgress(next, progressRef.current)) return;

    progressRef.current = next;
    saveLocal(next);
    setProgress(next);
  }, []);

  const collect = useCallback(
    (itemId) => {
      if (!ITEM_IDS.has(itemId)) return;
      update((current) => ({ ...current, items: [...current.items, itemId] }));
    },
    [update],
  );

  const chooseHouse = useCallback(
    (houseId) => {
      if (!HOUSE_IDS.has(houseId)) return;
      update((current) => ({ ...current, house: houseId }));
    },
    [update],
  );

  const chooseWand = useCallback(
    (wandId) => {
      if (!WAND_IDS.has(wandId)) return;
      update((current) => ({ ...current, wand: wandId }));
    },
    [update],
  );

  const learnSpell = useCallback(
    (spellId) => {
      if (!SPELL_IDS.has(spellId)) return;
      update((current) => ({ ...current, spells: [...current.spells, spellId] }));
    },
    [update],
  );

  const setCurrentPlace = useCallback(
    (placeId) => {
      if (!PLACE_IDS.has(placeId)) return;
      update((current) => ({ ...current, currentPlace: placeId }));
    },
    [update],
  );

  const reset = useCallback(async () => {
    progressRef.current = { ...EMPTY_PROGRESS };
    saveLocal(progressRef.current);
    setProgress(progressRef.current);

    const user = remoteUserRef.current;
    if (!user || !hasFirebaseConfig) return;

    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, "progress", user.uid),
      toProgressDoc(user, EMPTY_PROGRESS),
    );
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const { auth } = getFirebaseServices();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setAuthError(error.code || "auth/google-sign-in-failed");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const submitEmail = useCallback(async ({ email, password, mode }) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const { auth } = getFirebaseServices();
      const action =
        mode === "signup"
          ? createUserWithEmailAndPassword
          : signInWithEmailAndPassword;
      await action(auth, email, password);
    } catch (error) {
      setAuthError(error.code || "auth/email-sign-in-failed");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const { auth } = getFirebaseServices();
      await signOut(auth);
    } catch (error) {
      setAuthError(error.code || "auth/sign-out-failed");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const collected = useMemo(() => new Set(progress.items), [progress.items]);
  const persistence = !online
    ? "offline"
    : syncState === "cloud"
      ? "cloud"
      : "local";

  return {
    authError,
    authLoading,
    authUser,
    chooseHouse,
    chooseWand,
    clearAuthError: () => setAuthError(""),
    continueAsGuest,
    collect,
    collected,
    currentPlace: progress.currentPlace,
    ending: progress.ending,
    firebaseConfigured: hasFirebaseConfig,
    house: progress.house,
    learnSpell,
    persistence,
    ready,
    reset,
    settled,
    setCurrentPlace,
    signInWithGoogle,
    spells: progress.spells,
    submitEmail,
    syncState,
    wand: progress.wand,
  };
}
