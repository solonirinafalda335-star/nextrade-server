const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connexion
const connectionString = "postgresql://admin:aONttbqvjXkSHfsViJVKEnmlid1txweQ@dpg-d1uvn9mmcj7s73etg0u0-a.oregon-postgres.render.com/mturk_ocr_server";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// --- INSCRIPTION UTILISATEUR ---
app.post('/register', async (req, res) => {
  const { username, password, nom } = req.body;

  if (!username || !password || !nom) {
    return res.status(400).json({ success: false, message: "Tous les champs sont obligatoires" });
  }

  try {
    // Vérifie si username existe déjà
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Nom d'utilisateur déjà utilisé" });
    }

    // Hash du mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insérer utilisateur
    await pool.query(
      'INSERT INTO users (username, password, nom) VALUES ($1, $2, $3)',
      [username, hashedPassword, nom]
    );

    res.status(201).json({ success: true, message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// --- CONNEXION UTILISATEUR ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }

    res.status(200).json({ success: true, message: "Connexion réussie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// --- GENERER CODE LICENCE ---
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

    res.json({
      success: true,
      code,
      offre,
      expiration: expiration.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde" });
  }
});

// --- LISTE DES CODES ---
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

// --- VERIFIER CODE LICENCE ---
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

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// --- PAGE ACCUEIL ---
app.get('/', (req, res) => {
  res.send('✅ NexTrade server is running');
});

// --- LANCEMENT SERVEUR ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur NexTrade actif sur http://localhost:${PORT}`);
});
