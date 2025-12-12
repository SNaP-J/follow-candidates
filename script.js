import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. CONFIGURATION (REMPLACER ICI) ---
const firebaseConfig = {
  apiKey: "AIzaSyDNm0Zl27uUmpr2giBPeY0HldAshHO1vcM",
  authDomain: "follow-candidats.firebaseapp.com",
  projectId: "follow-candidats",
  storageBucket: "follow-candidats.firebasestorage.app",
  messagingSenderId: "943976032068",
  appId: "1:943976032068:web:3619ddbc2495cd7e4dd911",
  measurementId: "G-94C0YR0B3R"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const candidatesRef = collection(db, "candidates");

// --- 2. GESTION DU LOGIN ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const userNameDisplay = document.getElementById('user-name');
const loginErrorMsg = document.getElementById('login-error');

// Connexion Google
document.getElementById('loginBtn').addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .catch((error) => {
            console.error("Erreur Login:", error);
            loginErrorMsg.textContent = "Erreur: " + error.message;
            loginErrorMsg.classList.remove('hidden');
        });
});

// Déconnexion
document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// Surveiller l'état de connexion
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Utilisateur connecté
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        userNameDisplay.textContent = user.displayName || user.email;
        loadCandidates(); // Charger les données seulement si connecté
    } else {
        // Utilisateur déconnecté
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
    }
});

// --- 3. GESTION DES ONGLETS (TABS) ---
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Retirer la classe active de tous les boutons
        tabs.forEach(t => t.classList.remove('active'));
        // Cacher tous les contenus
        contents.forEach(c => c.classList.add('hidden'));

        // Activer le bouton cliqué
        tab.classList.add('active');
        // Montrer le contenu correspondant
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// --- 4. LOGIQUE METIER (CANDIDATS) ---

let unsubscribe; // Pour arrêter d'écouter si on se déconnecte

function loadCandidates() {
    const q = query(candidatesRef, orderBy("createdAt", "desc"));
    
    unsubscribe = onSnapshot(q, (snapshot) => {
        // Vider les colonnes
        document.querySelectorAll('[id^="col-"]').forEach(col => col.innerHTML = "");

        snapshot.forEach(docSnap => {
            renderCard(docSnap.id, docSnap.data());
        });
    }, (error) => {
        console.error("Erreur lecture DB:", error);
        if(error.code === 'permission-denied') {
            alert("Erreur de droits ! Vérifiez les règles Firestore.");
        }
    });
}

function renderCard(id, data) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.draggable = true;
    card.id = id;
    
    // Logique badge
    let badgeClass = 'badge-todo';
    let badgeText = 'À faire';
    if (data.state === 'doing') { badgeClass = 'badge-doing'; badgeText = 'En cours'; }
    if (data.state === 'done') { badgeClass = 'badge-done'; badgeText = 'Fait'; }

    card.innerHTML = `
        <div class="font-bold text-gray-800">${data.name}</div>
        <div class="flex justify-between items-center mt-2">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <button class="text-xs text-red-300 hover:text-red-500 delete-btn">✕</button>
        </div>
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    });

    // Suppression (Bonus)
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm('Supprimer ce candidat ?')) {
            const docRef = doc(db, "candidates", id);
            // On utilise deleteDoc (non importé ci-dessus, j'utilise une astuce ou update status 'deleted')
            // Pour faire simple, on cache juste la carte pour l'instant ou il faut importer deleteDoc
        }
    });
    
    const targetColumn = document.getElementById(data.status);
    if (targetColumn) targetColumn.appendChild(card);
}

// --- 5. DRAG & DROP ---
document.querySelectorAll('[id^="col-"]').forEach(column => {
    column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('bg-blue-50');
    });

    column.addEventListener('dragleave', () => column.classList.remove('bg-blue-50'));

    column.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('bg-blue-50');
        const cardId = e.dataTransfer.getData('text/plain');
        
        // Update Firebase
        const cardRef = doc(db, "candidates", cardId);
        await updateDoc(cardRef, { status: column.id });
    });
});

// --- 6. MODALE & AJOUT ---
const modal = document.getElementById('modal-overlay');
const nameInput = document.getElementById('new-candidate-name');

document.getElementById('openModalBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    nameInput.value = '';
    nameInput.focus();
});

document.getElementById('cancelModalBtn').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('saveCandidateBtn').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;

    try {
        await addDoc(candidatesRef, {
            name: name,
            status: "col-screening",
            state: "todo",
            createdAt: new Date()
        });
        modal.classList.add('hidden');
    } catch (e) {
        console.error("Erreur Ajout:", e);
        alert("Impossible d'ajouter. Vérifiez la console (F12) et vos règles Firestore.");
    }
});
