
import { initializeApp, getApp, getApps } from "firebase/app";

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";

import { getDatabase } from "firebase/database";

import AsyncStorage from "@react-native-async-storage/async-storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFAkSDQb9bW-45hSZ4WUk7xZ_bjCX43bY",
  authDomain: "portail-coulissant.firebaseapp.com",
  databaseURL: "https://portail-coulissant-default-rtdb.firebaseio.com",
  projectId: "portail-coulissant",
  storageBucket: "portail-coulissant.firebasestorage.app",
  messagingSenderId: "422045181113",
  appId: "1:422045181113:web:1ecb1e524c1dbff15ca768",
  measurementId: "G-ZYRTP2XR1L"
};

// Initialize Firebase only once.
export const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

// Initialize Authentication.
let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  if (error.code === "auth/already-initialized") {
    authInstance = getAuth(app);
  } else {
    throw error;
  }
}

export const auth = authInstance;

// Initialize Realtime Database.
export const database = getDatabase(app);
