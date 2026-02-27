import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDaqWPV1xfv9BgZcoqBCBa9ftDS1Mu4Y_w",
  authDomain: "trade-planner-5e9e9.firebaseapp.com",
  projectId: "trade-planner-5e9e9",
  storageBucket: "trade-planner-5e9e9.firebasestorage.app",
  messagingSenderId: "51519130166",
  appId: "1:51519130166:web:c99fcb053413bdb0c02697",
  measurementId: "G-YDNBR15HZP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

let analytics: any = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

export { analytics };
