import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBi_wI2eBtruG8yPw3GboNRSqnEsIiank4",
  authDomain: "spottify-340da.firebaseapp.com",
  projectId: "spottify-340da",
  storageBucket: "spottify-340da.firebasestorage.app",
  messagingSenderId: "202222226360",
  appId: "1:202222226360:web:adfd8541bf5b5329865d4d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);