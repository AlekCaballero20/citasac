import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  increment,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig, APP_CONFIG } from "./config.js";

const PLACEHOLDER = "PEGA_AQUI";

export function hasValidFirebaseConfig() {
  return Boolean(
    firebaseConfig?.apiKey &&
    firebaseConfig?.projectId &&
    !String(firebaseConfig.apiKey).includes(PLACEHOLDER) &&
    !String(firebaseConfig.projectId).includes(PLACEHOLDER)
  );
}

let app;
let auth;
let db;
let provider;

export function initFirebase() {
  if (!hasValidFirebaseConfig()) return null;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return { app, auth, db };
}

export function getFirebaseServices() {
  return { app, auth, db };
}

export function isAllowedEmail(email = "") {
  return APP_CONFIG.allowedEmails.map((item) => item.toLowerCase()).includes(email.toLowerCase());
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const email = result.user?.email || "";
  if (!isAllowedEmail(email)) {
    await signOut(auth);
    throw new Error(`El correo ${email} no está autorizado para esta app.`);
  }

  await setDoc(
    doc(db, "couples", APP_CONFIG.coupleId, "members", result.user.uid),
    {
      uid: result.user.uid,
      email,
      displayName: result.user.displayName || email,
      photoURL: result.user.photoURL || "",
      lastLoginAt: serverTimestamp()
    },
    { merge: true }
  );

  return result.user;
}

export function logout() {
  return signOut(auth);
}

function ideasRef() {
  return collection(db, "couples", APP_CONFIG.coupleId, "ideas");
}

function logsRef() {
  return collection(db, "couples", APP_CONFIG.coupleId, "logs");
}

export function observeIdeas(callback, onError) {
  const q = query(ideasRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const ideas = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      callback(ideas);
    },
    onError
  );
}

export function observeLogs(callback, onError) {
  const q = query(logsRef(), orderBy("dateAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      callback(logs);
    },
    onError
  );
}

export async function saveIdea(ideaId, data, user) {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: user.email,
    updatedByName: user.displayName || user.email
  };

  if (ideaId) {
    await updateDoc(doc(db, "couples", APP_CONFIG.coupleId, "ideas", ideaId), payload);
    return ideaId;
  }

  const created = await addDoc(ideasRef(), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: user.email,
    createdByName: user.displayName || user.email,
    archived: false,
    favorite: Boolean(data.favorite),
    timesDone: 0,
    ratingCount: 0,
    ratingSum: 0,
    lastDoneAt: null
  });

  return created.id;
}

export async function removeIdea(ideaId) {
  await deleteDoc(doc(db, "couples", APP_CONFIG.coupleId, "ideas", ideaId));
}

export async function archiveIdea(ideaId, archived) {
  await updateDoc(doc(db, "couples", APP_CONFIG.coupleId, "ideas", ideaId), {
    archived,
    updatedAt: serverTimestamp()
  });
}

export async function seedStarterIdeas(user) {
  const snapshot = await getDocs(ideasRef());
  if (!snapshot.empty) {
    throw new Error("Ya existen ideas guardadas. No voy a duplicarlas como gremlin con acceso a base de datos.");
  }

  const batch = writeBatch(db);
  APP_CONFIG.starterIdeas.forEach((idea) => {
    const ref = doc(ideasRef());
    batch.set(ref, {
      ...idea,
      favorite: false,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.email,
      createdByName: user.displayName || user.email,
      updatedBy: user.email,
      updatedByName: user.displayName || user.email,
      lastDoneAt: null,
      timesDone: 0,
      ratingCount: 0,
      ratingSum: 0
    });
  });

  await batch.commit();
}

export async function logIdeaDone(idea, data, user) {
  const date = data.dateAt ? new Date(data.dateAt) : new Date();
  const rating = Number(data.rating || 0);

  await addDoc(logsRef(), {
    ideaId: idea.id,
    ideaTitle: idea.title,
    category: idea.category || "Sin categoría",
    dateAt: Timestamp.fromDate(date),
    rating,
    mood: data.mood || "",
    cost: Number(data.cost || 0),
    note: data.note || "",
    createdAt: serverTimestamp(),
    createdBy: user.email,
    createdByName: user.displayName || user.email
  });

  await updateDoc(doc(db, "couples", APP_CONFIG.coupleId, "ideas", idea.id), {
    lastDoneAt: Timestamp.fromDate(date),
    timesDone: increment(1),
    ratingCount: increment(rating > 0 ? 1 : 0),
    ratingSum: increment(rating),
    updatedAt: serverTimestamp(),
    updatedBy: user.email,
    updatedByName: user.displayName || user.email
  });
}
