// ===== CONFIGURACIÓN DE FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3CWpkbJq7PQPgTWpKixVM3xBESU2vkxU",
  authDomain: "game-store-b0576.firebaseapp.com",
  projectId: "game-store-b0576",
  storageBucket: "game-store-b0576.firebasestorage.app",
  messagingSenderId: "855047752552",
  appId: "1:855047752552:web:a7030e5e6b0ccbcfc724dd"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Exportar para usar en otros archivos
export { 
    db, 
    auth, 
    storage,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    ref,
    uploadBytes,
    getDownloadURL
};