import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, database } from "../firebaseConfig";

export async function registerUser(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  const user = credential.user;
  const cleanName = name.trim();

  await updateProfile(user, { displayName: cleanName });

  // A new account starts with an empty doors collection.
  // Doors are created only when the user taps ADD DOOR in the app.
  await update(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    name: cleanName,
    email: email.trim(),
    createdAt: Date.now(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  await signOut(auth);
}
