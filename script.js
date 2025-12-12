import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// AJOUT DE deleteDoc ICI
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- REMPLACEZ VOTRE CONFIG ICI ---
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

// --- LOGIN ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const userNameDisplay = document.getElementById('user-name');
const loginErrorMsg = document.getElementById('login-error');

document.getElementById('loginBtn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        loginErrorMsg.textContent = error.message;
        loginErrorMsg.classList.remove('hidden');
    });
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        userNameDisplay.textContent = user.displayName.split(' ')[0]; // Juste le prénom
        loadCandidates();
    } else {
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
    }
});

// --- TABS ---
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.remove('hidden');
    });
});

// --- CANDIDATS ---
let unsubscribe;

function loadCandidates() {
    const q = query(candidatesRef, orderBy("createdAt", "desc"));
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(q, (snapshot) => {
        document.querySelectorAll('[id^="col-"]').forEach(col => col.innerHTML = "");
        snapshot.forEach(docSnap => {
            renderCard(docSnap.id, docSnap.data());
        });
    });
}

// Liste des statuts possibles pour le menu déroulant
const allStatuses = {
    'col-screening': 'Screening',
    'col-algo': 'Tech: Algo',
    'col-laf': 'Tech: L&F',
    'col-retour-tech': 'Tech: Retour',
    'col-commerce': 'Offre: Commerce',
    'col-reconfirmer': 'Offre: Reconfirmer',
    'col-propale': 'Offre: Propale'
};

function renderCard(id, data) {
    const card = document.createElement('div');
    card.className = 'candidate-card group'; // 'group' pour effets hover
    card.draggable = true;
    card.id = id;
    
    // Génération du menu déroulant (Select)
    let selectOptions = '';
    for (const [val, label] of Object.entries(allStatuses)) {
        const selected = (val === data.status) ? 'selected' : '';
        selectOptions += `<option value="${val}" ${selected}>${label}</option>`;
    }

    // Gestion couleur badge
    let badgeClass = 'badge-todo';
    if (data.state === 'doing') badgeClass = 'badge-doing';
    if (data.state === 'done') badgeClass = 'badge-done';

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="font-bold text-gray-800 text-sm">${data.name}</div>
            <button class="delete-btn text-gray-300 hover:text-red-500 p-1 -mt-1 -mr-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        
        <div class="flex flex-col gap-2">
            <div class="cursor-pointer" id="badge-${id}">
                <span class="badge ${badgeClass}">${data.state || 'todo'}</span>
            </div>

            <select class="move-select text-xs border border-gray-200 rounded bg-gray-50 p-1 w-full mt-1 text-gray-600 focus:ring-1 focus:ring-blue-500">
                ${selectOptions}
            </select>
        </div>
    `;

    // 1. Événement DELETE (Supprimer)
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        if(confirm(`Supprimer définitivement ${data.name} ?`)) {
            await deleteDoc(doc(db, "candidates", id));
        }
    });

    // 2. Événement MOVE (Via liste déroulante)
    const moveSelect = card.querySelector('.move-select');
    moveSelect.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        await updateDoc(doc(db, "candidates", id), { status: newStatus });
    });

    // 3. Événement TOGGLE STATE (Clic sur le badge)
    card.querySelector(`#badge-${id}`).addEventListener('click', async () => {
        let nextState = 'doing';
        if (data.state === 'todo') nextState = 'doing';
        else if (data.state === 'doing') nextState = 'done';
        else nextState = 'todo';
        await updateDoc(doc(db, "candidates", id), { state: nextState });
    });

    // 4. Événement DRAG (Desktop seulement)
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
    
    // Injection dans la bonne colonne
    const targetColumn = document.getElementById(data.status);
    if (targetColumn) targetColumn.appendChild(card);
}

// --- DRAG & DROP ZONES ---
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
        if(cardId) {
            await updateDoc(doc(db, "candidates", cardId), { status: column.id });
        }
    });
});

// --- MODALE ---
const modal = document.getElementById('modal-overlay');
const nameInput = document.getElementById('new-candidate-name');

document.getElementById('openModalBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    nameInput.value = '';
    // Petit hack pour focus sur mobile sans zoomer
    setTimeout(() => nameInput.focus(), 100);
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
        alert("Erreur: " + e.message);
    }
});
