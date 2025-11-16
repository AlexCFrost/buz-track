import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, remove } from 'firebase/database';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { SharedUser } from '../types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ========== Authentication Functions ==========

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// Sign in with Email/Password
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Sign up with Email/Password
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// ========== Session Management Functions ==========

export interface Session {
  code: string;
  createdAt: number;
  expiresAt: number;
  users: { [key: string]: SharedUser };
}

// Create a new session with a unique code
export const createSession = async (code: string): Promise<void> => {
  const sessionRef = ref(database, `sessions/${code}`);
  await set(sessionRef, {
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    users: {}
  });
};

// Check if a session exists
export const sessionExists = async (code: string): Promise<boolean> => {
  const sessionRef = ref(database, `sessions/${code}`);
  const snapshot = await get(sessionRef);
  return snapshot.exists();
};

// Add a user to a session
export const addUserToSession = async (code: string, user: SharedUser): Promise<void> => {
  const userRef = ref(database, `sessions/${code}/users/${user.id}`);
  await set(userRef, user);
};

// Listen to users in a session
export const listenToSessionUsers = (
  code: string,
  callback: (users: SharedUser[]) => void
): (() => void) => {
  const usersRef = ref(database, `sessions/${code}/users`);
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const users = Object.values(data) as SharedUser[];
      // Filter out expired users
      const validUsers = users.filter(u => u.expiresAt > Date.now());
      callback(validUsers);
    } else {
      callback([]);
    }
  });

  return unsubscribe;
};

// Remove a user from a session
export const removeUserFromSession = async (code: string, userId: string): Promise<void> => {
  const userRef = ref(database, `sessions/${code}/users/${userId}`);
  await remove(userRef);
};

// Delete an entire session
export const deleteSession = async (code: string): Promise<void> => {
  const sessionRef = ref(database, `sessions/${code}`);
  await remove(sessionRef);
};

// Clean up expired users periodically
export const cleanupExpiredUsers = async (code: string): Promise<void> => {
  const usersRef = ref(database, `sessions/${code}/users`);
  const snapshot = await get(usersRef);
  
  if (snapshot.exists()) {
    const users = snapshot.val();
    const now = Date.now();
    
    for (const [userId, user] of Object.entries(users)) {
      const userData = user as SharedUser;
      if (userData.expiresAt < now) {
        await removeUserFromSession(code, userId);
      }
    }
  }
};
