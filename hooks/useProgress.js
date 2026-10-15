"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ITEM_IDS } from "@/data/places";
import { getFirebaseServices, hasFirebaseConfig } from "@/lib/firebase";

const STORAGE_KEY = "tp6-hogwarts-progress";
// En Firestore los ítems se siguen guardando en el campo `clues` de progress/{uid}:
// la estructura del documento cambia recién en la Fase 2.

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((itemId) => ITEM_IDS.has(itemId)))];
}

function readLocal() {
  try {
    return normalizeItems(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"),
    );
  } catch {
    return [];
  }
}

function saveLocal(items) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getProvider(user) {
  if (user.isAnonymous) return "anonymous";
  return user.providerData[0]?.providerId || "password";
}

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
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState("local");
  const [remoteUser, setRemoteUser] = useState(null);
  const remoteUserRef = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const localItems = readLocal();
    itemsRef.current = localItems;

    const hydrateLocal = window.setTimeout(() => {
      setItems(localItems);
      saveLocal(localItems);
      setReady(true);
    }, 0);

    if (!hasFirebaseConfig) return () => window.clearTimeout(hydrateLocal);

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
        }
        return;
      }

      try {
        setSyncState("connecting");
        await saveUserProfile(user, db);

        const progressRef = doc(db, "progress", user.uid);
        const snapshot = await getDoc(progressRef);
        const remoteItems = normalizeItems(
          snapshot.exists() ? snapshot.data().clues : [],
        );
        const mergedItems = normalizeItems([
          ...itemsRef.current,
          ...remoteItems,
        ]);

        itemsRef.current = mergedItems;
        setItems(mergedItems);
        saveLocal(mergedItems);
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
      }
    });

    return () => {
      window.clearTimeout(hydrateLocal);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !remoteUser) return;
    const { db } = getFirebaseServices();
    setDoc(
      doc(db, "progress", remoteUser.uid),
      {
        userId: remoteUser.uid,
        authProvider: getProvider(remoteUser),
        clues: items,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch((error) => console.warn("No se pudo sincronizar el progreso.", error));
  }, [items, ready, remoteUser]);

  const collect = useCallback((itemId) => {
    if (!ITEM_IDS.has(itemId) || itemsRef.current.includes(itemId)) return;

    const nextItems = [...itemsRef.current, itemId];
    itemsRef.current = nextItems;
    saveLocal(nextItems);
    setItems(nextItems);
  }, []);

  const reset = useCallback(async () => {
    itemsRef.current = [];
    saveLocal([]);
    setItems([]);

    const user = remoteUserRef.current;
    if (!user || !hasFirebaseConfig) return;

    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, "progress", user.uid),
      {
        userId: user.uid,
        authProvider: getProvider(user),
        clues: [],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
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

  const collected = useMemo(() => new Set(items), [items]);

  return {
    authError,
    authLoading,
    authUser,
    clearAuthError: () => setAuthError(""),
    continueAsGuest,
    collect,
    collected,
    firebaseConfigured: hasFirebaseConfig,
    ready,
    reset,
    signInWithGoogle,
    submitEmail,
    syncState,
  };
}
