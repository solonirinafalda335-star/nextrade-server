// server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 📁 Fichier de stockage des utilisateurs
const USERS_FILE = "./utilisateurs.json";

app.get('/', (req, res) => {
  res.send('✅ NexTrade server is running');
});

// 🔄 Fonctions utilitaires
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ✅ Liste des codes valides avec expiration et deviceId
const licencesValides = {
  "CODEGRATUIT7J": {
    valid: true,
    expiration: "2025-08-01", // YYYY-MM-DD
    deviceId: null
  },
  "CODEMOIS1": {
    valid: true,
    expiration: "2025-08-24",
    deviceId: null
  },
  "ABC123": {
    valid: true,
    expiration: "2025-08-10",
    deviceId: null
  }
};

// 📝 Enregistrement d'un nouvel utilisateur
app.post('/register', (req, res) => {
  const { nom, motdepasse } = req.body;

  if (!nom || !motdepasse) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  const users = getUsers();
  const existe = users.find(u => u.nom === nom);

  if (existe) {
    return res.status(409).json({ success: false, message: "Ce nom est déjà utilisé" });
  }

  users.push({ nom, motdepasse });
  saveUsers(users);

  return res.status(201).json({ success: true, message: "Utilisateur enregistré avec succès" });
});

// 🔐 Connexion d'un utilisateur
app.post('/login', (req, res) => {
  const { nom, motdepasse } = req.body;

  if (!nom || !motdepasse) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  const users = getUsers();
  const utilisateur = users.find(u => u.nom === nom && u.motdepasse === motdepasse);

  if (!utilisateur) {
    return res.status(401).json({ success: false, message: "Identifiants incorrects" });
  }

  return res.status(200).json({ success: true, message: "Connexion réussie" });
});

// 🔍 Vérification du code de licence
app.post('/verifier-code', (req, res) => {
  const { code, deviceId } = req.body;
  console.log(`📥 Code reçu : ${code} | 📱 deviceId : ${deviceId}`);

  if (!code || !deviceId) {
    return res.status(400).json({ success: false, message: "Code et deviceId requis" });
  }

  const licence = licencesValides[code];

  if (!licence || !licence.valid) {
    return res.status(403).json({ success: false, message: "Code invalide ou expiré" });
  }

  const now = new Date();
  const expirationDate = new Date(licence.expiration);

  if (expirationDate < now) {
    return res.status(403).json({ success: false, message: "Code expiré" });
  }

  // Cas 1 : Premier usage — on enregistre le deviceId
  if (licence.deviceId === null) {
    licence.deviceId = deviceId;
    return res.json({ success: true, message: "Code activé avec succès", expiration: licence.expiration });
  }

  // Cas 2 : Même appareil que déjà lié
  if (licence.deviceId === deviceId) {
    return res.json({ success: true, message: "Code reconnu", expiration: licence.expiration });
  }

  // Cas 3 : Tentative sur un autre appareil
  return res.status(403).json({
    success: false,
    message: "Ce code a déjà été utilisé sur un autre appareil"
  });
});

// 🚀 Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur NexTrade actif sur http://localhost:${PORT}`);
});
