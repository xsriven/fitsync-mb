// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCepqqWBmQObnxprKl-h4OPZ8OhWTqDJHw",
  authDomain: "fitsync-auth-9d3a8.firebaseapp.com",
  projectId: "fitsync-auth-9d3a8",
  storageBucket: "fitsync-auth-9d3a8.appspot.com",
  messagingSenderId: "1012345678901",
  appId: "1:1012345678901:web:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);