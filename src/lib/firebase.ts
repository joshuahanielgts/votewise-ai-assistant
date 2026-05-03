import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: "votewise-494715",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
};

// Initialize Firebase only once (important for SSR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export interface StoredMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Timestamp | null;
  sessionId: string;
}

/**
 * Save a chat message to Firestore.
 * Uses the free Spark plan — 20K writes/day.
 */
export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  try {
    await addDoc(collection(db, "chat_sessions", sessionId, "messages"), {
      role,
      content,
      sessionId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Fail silently — Firestore is enhancement, not critical path
    console.warn("Firestore write failed:", error);
  }
}

/**
 * Load the last 20 messages for a session from Firestore.
 * Uses the free Spark plan — 50K reads/day.
 */
export async function loadSessionHistory(
  sessionId: string
): Promise<StoredMessage[]> {
  try {
    const q = query(
      collection(db, "chat_sessions", sessionId, "messages"),
      orderBy("timestamp", "asc"),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<StoredMessage, "id">),
    }));
  } catch (error) {
    console.warn("Firestore read failed:", error);
    return [];
  }
}
