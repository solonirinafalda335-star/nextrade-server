// server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/generer-code', (req, res) => {
  const { offre, duree, adminKey } = req.body;

  if (adminKey !== 'admin123') {
    return res.status(403).json({ success: false, message: "Clé admin incorrecte" });
  }

  if (!offre || !duree) {
    return res.status(400).json({ success: false, message: "offre et durée sont requis" });
  }

  const code = Math.random().toString(36).substr(2, 8).toUpperCase();
  const maintenant = new Date();
  const expiration = new Date(maintenant.getTime() + duree * 24 * 60 * 60 * 1000);

  licencesValides[code] = {
    valid: true,
    expiration: expiration.toISOString().split('T')[0],
    deviceId: null,
    offre
  };

  return res.json({
    success: true,
    code,
    expiration: licencesValides[code].expiration,
    offre
  });
});

// 📁 Fichier de stockage des utilisateurs (local fallback)
// Tu peux supprimer cette partie si tu veux 100% PostgreSQL
const USERS_FILE = "./utilisateurs.json";

// Connexion à ta base PostgreSQL Render
const connectionString = "postgresql://admin:aONttbqvjXkSHfsViJVKEnmlid1txweQ@dpg-d1uvn9mmcj7s73etg0u0-a.oregon-postgres.render.com/mturk_ocr_server";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get('/', (req, res) => {
  res.send('✅ NexTrade server is running');
});

// Fonctions utilitaires fichier local (optionnel)
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Codes valides (en mémoire)
const licencesValides = {
  "CODEGRATUIT7J": { valid: true, expiration: "2025-08-01", deviceId: null },
  "CODEMOIS1": { valid: true, expiration: "2025-08-24", deviceId: null },
  "ABC123": { valid: true, expiration: "2025-08-10", deviceId: null }
};

// --- Inscription : enregistre en PostgreSQL ---
app.post('/register', async (req, res) => {
  const { nom, motdepasse } = req.body;

  if (!nom || !motdepasse) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  try {
    // Vérifier si l'utilisateur existe
    const result = await pool.query('SELECT * FROM users WHERE nom = $1', [nom]);
    if (result.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ce nom est déjà utilisé" });
    }

    // Insérer utilisateur (penser à hasher le mdp en vrai prod)
    await pool.query('INSERT INTO users (nom, motdepasse) VALUES ($1, $2)', [nom, motdepasse]);

    return res.status(201).json({ success: true, message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// --- Connexion ---
app.post('/login', async (req, res) => {
  const { nom, motdepasse } = req.body;

  if (!nom || !motdepasse) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE nom = $1', [nom]);

    if (result.rows.length === 0 || result.rows[0].motdepasse !== motdepasse) {
      return res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }

    return res.status(200).json({ success: true, message: "Connexion réussie" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// --- Vérification du code de licence ---
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

  if (licence.deviceId === null) {
    licence.deviceId = deviceId;
    return res.json({ success: true, message: "Code activé avec succès", expiration: licence.expiration });
  }

  if (licence.deviceId === deviceId) {
    return res.json({ success: true, message: "Code reconnu", expiration: licence.expiration });
  }

  return res.status(403).json({
    success: false,
    message: "Ce code a déjà été utilisé sur un autre appareil"
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur NexTrade actif sur http://localhost:${PORT}`);
});
