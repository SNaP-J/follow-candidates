// Import des fonctions Firebase depuis le CDN (pas besoin d'installation)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURATION FIREBASE ---
// 1. Allez sur la console Firebase > Project Settings > General > "Your apps"
// 2. Copiez l'objet "firebaseConfig" et remplacez celui ci-dessous :
const firebaseConfig = {
    apiKey: "AIzaSyDNm0Zl27uUmpr2giBPeY0HldAshHO1vcM",
    authDomain: "follow-candidats.firebaseapp.com",
    projectId: "follow-candidats",
    storageBucket: "follow-candidats.firebasestorage.app",
    messagingSenderId: "943976032068",
    appId: "1:943976032068:web:3619ddbc2495cd7e4dd911",
    measurementId: "G-94C0YR0B3R"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const candidatesRef = collection(db, "candidates");

// --- LOGIQUE DE L'APPLICATION ---

// Écouter les changements dans la base de données en temps réel
const q = query(candidatesRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    // 1. Vider toutes les colonnes
    document.querySelectorAll('[id^="col-"]').forEach(col => col.innerHTML = "");

    // 2. Remplir avec les données reçues
    snapshot.forEach(docSnap => {
        const candidate = docSnap.data();
        const id = docSnap.id;
        renderCard(id, candidate);
    });
});

// Fonction pour dessiner une carte
function renderCard(id, data) {
    // Création HTML de la carte
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.draggable = true; // Rend la carte déplaçable
    card.id = id;
    
    // Déterminer la couleur du badge selon l'état
    let badgeClass = 'badge-todo';
    let badgeText = 'À faire';
    
    if (data.state === 'doing') { badgeClass = 'badge-doing'; badgeText = 'En cours'; }
    if (data.state === 'done') { badgeClass = 'badge-done'; badgeText = 'Fait'; }

    card.innerHTML = `
        <div class="font-bold text-gray-800">${data.name}</div>
        <div class="badge ${badgeClass}">${badgeText}</div>
    `;

    // Événement Drag Start
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    });
    
    // Injection dans la bonne colonne
    // Le champ "status" dans Firebase doit correspondre aux ID HTML (ex: 'col-algo')
    const targetColumn = document.getElementById(data.status);
    if (targetColumn) {
        targetColumn.appendChild(card);
    }
}

// --- GESTION DU DRAG & DROP ---

// Rendre toutes les colonnes "déposables"
document.querySelectorAll('[id^="col-"]').forEach(column => {
    column.addEventListener('dragover', (e) => {
        e.preventDefault(); // Nécessaire pour autoriser le drop
        column.classList.add('bg-blue-50'); // Petit effet visuel
    });

    column.addEventListener('dragleave', () => {
        column.classList.remove('bg-blue-50');
    });

    column.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('bg-blue-50');
        
        const cardId = e.dataTransfer.getData('text/plain');
        const newStatus = column.id; // L'ID de la colonne devient le nouveau status
        
        // Mise à jour dans Firebase
        const cardRef = doc(db, "candidates", cardId);
        await updateDoc(cardRef, {
            status: newStatus
        });
    });
});

// --- AJOUTER UN CANDIDAT (Test) ---
document.getElementById('addCandidateBtn').addEventListener('click', async () => {
    const name = prompt("Nom du candidat (ex: Prénom N.) :");
    if (name) {
        await addDoc(candidatesRef, {
            name: name,
            status: "col-screening", // Colonne par défaut
            state: "todo", // todo, doing, done
            createdAt: new Date()
        });
    }
});
