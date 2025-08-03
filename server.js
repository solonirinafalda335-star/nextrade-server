const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // ⚠️ Pour tests seulement ! Restreindre en prod
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static('public'));

// Simple authentification admin
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "superadmin2025";

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: "Accès refusé" });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Connexion PostgreSQL
const connectionString = "postgresql://admin:aONttbqvjXkSHfsViJVKEnmlid1txweQ@dpg-d1uvn9mmcj7s73etg0u0-a.oregon-postgres.render.com/mturk_ocr_server";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Génération de code avec stockage PostgreSQL
app.post('/generer-code', async (req, res) => {
  const { adminKey, offre, duree } = req.body;

  if (adminKey !== 'admin123') {
    return res.status(403).json({ success: false, message: "Clé admin invalide" });
  }

  if (!offre || !duree) {
    return res.status(400).json({ success: false, message: "Offre et durée requises" });
  }

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(now.getDate() + parseInt(duree));

  try {
    await pool.query(
      'INSERT INTO licences (code, plan, expiration, deviceId) VALUES ($1, $2, $3, $4)',
      [code, offre, expiration, null]
    );

    return res.json({ success: true, code, offre, expiration: expiration.toISOString().split('T')[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde" });
  }
});

// Liste des codes générés
app.get('/liste-codes', async (req, res) => {
  try {
    const result = await pool.query('SELECT code, plan, expiration, deviceId FROM licences ORDER BY expiration DESC');
    const codes = result.rows.map(row => ({
      code: row.code,
      plan: row.plan,
      expiration: row.expiration,
      is_active: row.deviceid !== null
    }));
    res.json({ success: true, codes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur lors du chargement des codes" });
  }
});

// Liste des utilisateurs inscrits
app.get('/liste-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT nom FROM users ORDER BY nom');
    const users = result.rows.map(row => ({ nom: row.nom }));
    res.json({ success: true, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur lors du chargement des utilisateurs" });
  }
});

// Inscription
app.post('/register', async (req, res) => {
  const { nom, motdepasse } = req.body;

  if (!nom || !motdepasse) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE nom = $1', [nom]);
    if (result.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Ce nom est déjà utilisé" });
    }

    await pool.query('INSERT INTO users (nom, motdepasse) VALUES ($1, $2)', [nom, motdepasse]);
    return res.status(201).json({ success: true, message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Connexion utilisateur
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

// Vérification du code de licence
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

    if (!licence.deviceid) {
      await pool.query('UPDATE licences SET deviceId = $1 WHERE code = $2', [deviceId, code]);
      return res.json({ success: true, message: "Code activé avec succès", expiration: licence.expiration });
    }

    if (licence.deviceid === deviceId) {
      return res.json({ success: true, message: "Code reconnu", expiration: licence.expiration });
    }

    return res.status(403).json({
      success: false,
      message: "Ce code est déjà utilisé sur un autre appareil"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

app.get('/', (req, res) => {
  res.send('✅ NexTrade server is running');
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur NexTrade actif sur http://localhost:${PORT}`);
});
