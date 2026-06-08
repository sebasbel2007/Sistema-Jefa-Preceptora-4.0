// ── CONFIGURACIÓN FIREBASE ──
const firebaseConfig = {
  apiKey: "AIzaSyC5JPWqTVEQxtAw9nYXUPKrXi7mZaNbS1w",
  authDomain: "jefa-de-preceptoras.firebaseapp.com",
  projectId: "jefa-de-preceptoras",
  storageBucket: "jefa-de-preceptoras.firebasestorage.app",
  messagingSenderId: "345566832934",
  appId: "1:345566832934:web:fb5ac92861d4775a5f39e7"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();
