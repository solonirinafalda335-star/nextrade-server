const currentLang = navigator.language.startsWith('fr') ? 'fr' : 'en';

document.addEventListener("DOMContentLoaded", () => {
  const nomInput = document.getElementById("nom");
  const passInput = document.getElementById("motdepasse");
  const inscrireBtn = document.getElementById("btn-inscrire");
  const logoutBtn = document.getElementById("btn-logout");

  const inscriptionSection = document.getElementById("inscription-section");
  const abonnementSection = document.getElementById("abonnement-section");
  const bienvenueMsg = document.getElementById("bienvenue-msg");
  const titreFormulaire = document.querySelector("#inscription-section h2");
  const lienConnexion = document.getElementById("lien-connexion");

  let enModeConnexion = false;

  // Affiche l'abonnement si déjà connecté
  if (localStorage.getItem("utilisateur_nom")) {
    inscriptionSection.style.display = "none";
    abonnementSection.style.display = "block";
    bienvenueMsg.textContent = (currentLang === "fr" ? "Bienvenue, " : "Welcome, ") + localStorage.getItem("utilisateur_nom") + " !";
  }

  // Changer entre mode inscription et connexion
  lienConnexion?.addEventListener("click", (e) => {
    e.preventDefault();
    enModeConnexion = !enModeConnexion;

    if (enModeConnexion) {
      titreFormulaire.textContent = currentLang === "fr" ? "Connexion" : "Login";
      inscrireBtn.textContent = currentLang === "fr" ? "Se connecter" : "Login";
      lienConnexion.textContent = currentLang === "fr"
        ? "Créer un nouveau compte ici"
        : "Create a new account here";
    } else {
      titreFormulaire.textContent = currentLang === "fr" ? "Inscription" : "Sign up";
      inscrireBtn.textContent = currentLang === "fr" ? "S’inscrire" : "Register";
      lienConnexion.textContent = currentLang === "fr"
        ? "Se connecter ici"
        : "Already have an account? Login";
    }
  });

  // Gérer le clic sur S’inscrire ou Se connecter
  inscrireBtn?.addEventListener("click", () => {
    const nom = nomInput.value.trim();
    const motdepasse = passInput.value.trim();

    if (!nom || !motdepasse) {
      alert(currentLang === "fr" ? "Veuillez remplir tous les champs !" : "Please fill in all fields!");
      return;
    }

    const endpoint = enModeConnexion ? "/login" : "/register";

    fetch(`http://localhost:3000${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, motdepasse })
    })
      .then(res => {
        if (res.status === 200) {
          localStorage.setItem("utilisateur_nom", nom);
          inscriptionSection.style.display = "none";
          abonnementSection.style.display = "block";
          bienvenueMsg.textContent = (currentLang === "fr" ? "Bienvenue, " : "Welcome, ") + nom + " !";
        } else {
          alert(currentLang === "fr"
            ? (enModeConnexion ? "Identifiants incorrects !" : "Nom déjà utilisé.")
            : (enModeConnexion ? "Invalid login!" : "Username already exists."));
        }
      })
      .catch(() => {
        alert("Erreur de connexion au serveur.");
      });
  });

  // Déconnexion
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("utilisateur_nom");
    localStorage.removeItem("plan_open");
    location.reload();
  });

  // Traduction automatique
  translateTexts();

  // Gestion des offres
  const toggleBox = (buttonId, boxId) => {
    const btn = document.getElementById(buttonId);
    const box = document.getElementById(boxId);

    btn.addEventListener("click", () => {
      const isOpen = box.classList.contains("open");
      document.querySelectorAll(".offre-box").forEach(b => b.classList.remove("open"));

      if (!isOpen) {
        box.classList.add("open");
        localStorage.setItem("plan_open", boxId);
      } else {
        localStorage.removeItem("plan_open");
      }
    });
  };

  toggleBox("btn-bronze", "bronze-offre");
  toggleBox("btn-argent", "argent-offre");
  toggleBox("btn-gold", "gold-offre");

  // Réouvrir l'offre précédente
  const lastOpen = localStorage.getItem("plan_open");
  if (lastOpen) {
    const box = document.getElementById(lastOpen);
    if (box) box.classList.add("open");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".offre-box").forEach(b => b.classList.remove("open"));
      localStorage.removeItem("plan_open");
    }
  });
});

// Traduction automatique (fr → en)
function translateTexts() {
  if (currentLang === "en") {
    document.querySelectorAll("p, label, button, strong, li, a, h1, h2").forEach(el => {
      const frText = el.textContent.trim();

      const translations = {
        "Offre Bronze": "Bronze Offer",
        "Offre Argent": "Silver Offer",
        "Offre Gold": "Gold Offer",
        "Code de validation :": "Validation Code:",
        "Besoin de code pour s'abonner ?": "Need a code to subscribe?",
        "Cliquez ici pour nous écrire sur WhatsApp": "Click here to message us on WhatsApp",
        "Valider": "Validate",
        "Entrez votre code ici...": "Enter your code here...",
        "Durée : 30 jours": "Duration: 30 days",
        "Accès limité aux fonctionnalités": "Limited access to features",
        "Signaux illimités": "Unlimited signals",
        "Inscription": "Sign up",
        "Connexion": "Login",
        "Votre nom complet": "Your full name",
        "Mot de passe": "Password",
        "S’inscrire": "Register",
        "Se connecter": "Login",
        "Bienvenue, ": "Welcome, ",
        "Se déconnecter": "Log out",
        "Créer un nouveau compte ici": "Create a new account here",
        "Se connecter ici": "Already have an account? Login"
      };

      for (let fr in translations) {
        if (frText.includes(fr)) {
          el.textContent = el.textContent.replaceAll(fr, translations[fr]);
        }
      }
    });
  }
}

// Pour la validation de code d’abonnement
function validerCode(button) {
  const input = button.previousElementSibling;
  const code = input.value.trim();
  if (code === "") {
    alert(currentLang === "fr" ? "Veuillez entrer un code." : "Please enter a code.");
  } else {
    alert(currentLang === "fr" ? "Code envoyé pour vérification..." : "Code sent for verification...");
    // Tu peux compléter ici l’appel API pour valider avec le serveur.
  }
}
// Pour la validation de code d’abonnement
function validerCode(button) {
  const input = button.previousElementSibling;
  const code = input.value.trim();

  if (code === "") {
    alert(currentLang === "fr" ? "Veuillez entrer un code." : "Please enter a code.");
    return;
  }
  function afficherSignaux() {
  const signalDiv = document.getElementById("signal-container");
  const plan = localStorage.getItem("plan_open");

  let signaux = [];

  if (plan === "gold-offre") {
    signaux = ["📈 Signal Gold 1 : EUR/USD 🔥", "📈 Signal Gold 2 : BTC/USD 💎"];
  } else if (plan === "argent-offre") {
    signaux = ["📉 Signal Argent 1 : GBP/USD", "📉 Signal Argent 2 : ETH/USD"];
  } else if (plan === "bronze-offre") {
    signaux = ["🔍 Signal Bronze 1 : USD/JPY"];
  }

  signalDiv.innerHTML = signaux.map(sig => `<p>${sig}</p>`).join("");
  signalDiv.style.display = "block";
}

fetch("http://localhost:3000/validate-code", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code })
})
.then(res => res.json())
.then(data => {
  if (data.success) {  // normalement ta réponse a un champ "success" (et non "valide")
    alert(currentLang === "fr" ? "Code valide ! Accès aux signaux débloqué." : "Valid code! Access unlocked.");
    afficherSignaux(); // fonction qui affiche les signaux selon l’offre
  } else {
    alert(currentLang === "fr" ? "Code invalide." : "Invalid code.");
  }
})
.catch(() => {
  alert("Erreur lors de la vérification du code.");
});
}