'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function initializeClientApp() {
  if (firebaseConfig.apiKey && !getApps().length) {
    return initializeApp(firebaseConfig);
  }

  if (getApps().length) {
    return getApp();
  }
  return null;
}

const firebaseApp = initializeClientApp();
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

export { firebaseApp, auth, firestore };
