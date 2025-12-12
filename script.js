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
        userNameDisplay.textContent = user.displayName.split(' ')[0];
        loadCandidates();
    } else {
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
    }
});

// --- NAVIGATION TABS ---
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

// --- CHARGEMENT & TRI ---
let unsubscribe;

// Ordre: TODO > DONE > DOING
const stateOrder = { 'todo': 1, 'done': 2, 'doing': 3 };

function loadCandidates() {
    const q = query(candidatesRef, orderBy("createdAt", "desc"));
    
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(q, (snapshot) => {
        document.querySelectorAll('[id^="col-"]').forEach(col => col.innerHTML = "");

        let candidates = [];
        snapshot.forEach(docSnap => {
            candidates.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Tri local
        candidates.sort((a, b) => {
            const weightA = stateOrder[a.state] || 99;
            const weightB = stateOrder[b.state] || 99;
            return weightA - weightB;
        });

        candidates.forEach(c => renderCard(c.id, c));
    });
}

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
    card.className = 'candidate-card group relative';
    card.draggable = true;
    card.id = id;
    
    // Select pour déplacer
    let selectOptions = `<option value="" disabled selected>Déplacer vers...</option>`;
    for (const [val, label] of Object.entries(allStatuses)) {
        if(val !== data.status) {
            selectOptions += `<option value="${val}">➔ ${label}</option>`;
        }
    }

    let badgeClass = 'badge-todo';
    if (data.state === 'doing') badgeClass = 'badge-doing';
    if (data.state === 'done') badgeClass = 'badge-done';

    // HTML avec la CROIX en haut à droite
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="font-bold text-gray-800 text-sm mb-2 pr-6">${data.name}</div>
            
            <button class="delete-btn text-gray-400 hover:text-red-500 absolute top-2 right-2 p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        
        <div class="flex justify-between items-end mt-2">
            <div class="cursor-pointer" id="badge-${id}">
                <span class="badge ${badgeClass}">${data.state || 'todo'}</span>
            </div>
        </div>

        <div class="mt-3 pt-2 border-t border-gray-100">
            <select class="move-select bg-gray-50 border border-gray-200 text-xs rounded p-1.5 w-full outline-none focus:border-blue-500">
                ${selectOptions}
            </select>
        </div>
    `;

    // --- EVENEMENTS ---

    // 1. SUPPRIMER (La logique qui manquait)
    card.querySelector('.delete-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(confirm(`Supprimer ${data.name} ?`)) {
            try {
                await deleteDoc(doc(db, "candidates", id));
            } catch (error) {
                alert("Erreur lors de la suppression : " + error.message);
                console.error(error);
            }
        }
    });

    // 2. DEPLACER
    card.querySelector('.move-select').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        if(newStatus) await updateDoc(doc(db, "candidates", id), { status: newStatus });
    });

    // 3. CHANGER ETAT
    card.querySelector(`#badge-${id}`).addEventListener('click', async (e) => {
        e.stopPropagation();
        let nextState = 'todo';
        if (data.state === 'todo') nextState = 'done';
        else if (data.state === 'done') nextState = 'doing';
        else if (data.state === 'doing') nextState = 'todo';
        await updateDoc(doc(db, "candidates", id), { state: nextState });
    });

    // 4. DRAG
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
    
    const targetColumn = document.getElementById(data.status);
    if (targetColumn) targetColumn.appendChild(card);
}

// --- ZONES DRAG & DROP ---
document.querySelectorAll('[id^="col-"]').forEach(column => {
    column.addEventListener('dragover', (e) => { e.preventDefault(); column.classList.add('bg-blue-50'); });
    column.addEventListener('dragleave', () => column.classList.remove('bg-blue-50'));
    column.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('bg-blue-50');
        const cardId = e.dataTransfer.getData('text/plain');
        if(cardId) await updateDoc(doc(db, "candidates", cardId), { status: column.id });
    });
});

// --- MODALE AJOUT ---
const modal = document.getElementById('modal-overlay');
const nameInput = document.getElementById('new-candidate-name');

document.getElementById('openModalBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    nameInput.value = '';
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
    } catch (e) { alert("Erreur ajout: " + e.message); }
});
