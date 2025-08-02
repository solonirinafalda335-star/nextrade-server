// server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // ⚠️ Pour tests seulement ! Tu peux restreindre plus tard
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static('public'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ✅ Génération de code avec stockage PostgreSQL
app.post('/generer-code', async (req, res) => {
  const { plan, duree, adminKey } = req.body;

  if (adminKey !== 'admin123') {
    return res.status(403).json({ success: false, message: "Clé admin invalide" });
  }

  if (!plan || !duree) {
    return res.status(400).json({ success: false, message: "Offre et durée requises" });
  }

  // 🔐 Générer un code aléatoire
  const code = Math.random().toString(36).substring(2, 10).toUpperCase(); // Exemple: 8 caractères

  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(now.getDate() + parseInt(duree));

  try {
    await pool.query(
      'INSERT INTO licences (code, offre, expiration, deviceId) VALUES ($1, $2, $3, $4)',
      [code, plan, expiration, null]
    );

    return res.json({ success: true, code, plan, expiration: expiration.toISOString().split('T')[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde" });
  }
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
app.post('/verifier-code', async (req, res) => {
  const { code, deviceId } = req.body;

  if (!code || !deviceId) {
    return res.status(400).json({ success: false, message: "Code et deviceId requis" });
  }

  try {
    const result = await pool.query('SELECT * FROM licences WHERE code = $1', [code]);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Code invalide" });
    }

    const licence = result.rows[0];
    const expirationDate = new Date(licence.expiration);
    const now = new Date();

    if (expirationDate < now) {
      return res.status(403).json({ success: false, message: "Code expiré" });
    }

    // Si jamais pas encore activé
    if (!licence.deviceid) {
      await pool.query('UPDATE licences SET deviceId = $1 WHERE code = $2', [deviceId, code]);
      return res.json({ success: true, message: "Code activé avec succès", expiration: licence.expiration });
    }

    // Si déjà activé sur ce device
    if (licence.deviceid === deviceId) {
      return res.json({ success: true, message: "Code reconnu", expiration: licence.expiration });
    }

    // Utilisé sur un autre appareil
    return res.status(403).json({
      success: false,
      message: "Ce code est déjà utilisé sur un autre appareil"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur NexTrade actif sur http://localhost:${PORT}`);
});
