import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project configuration
// You can get this from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyCs1bj513Ra5y_PjgszfSBQHJ62RpYbF4o",
    authDomain: "blackjack-friends.firebaseapp.com",
    databaseURL: "https://blackjack-friends-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "blackjack-friends",
    storageBucket: "blackjack-friends.firebasestorage.app",
    messagingSenderId: "320816606306",
    appId: "1:320816606306:web:6defe34ad12fe22860353b"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
