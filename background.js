chrome.runtime.onInstalled.addListener(() => {
  console.log("NexTrade background service worker démarré");
});

// Exemple simple pour afficher une notification chaque minute si licence active
async function checkLicenseAndNotify() {
  const data = await chrome.storage.local.get(['codeActif', 'expiration']);
  const now = Date.now();

  if (data.codeActif && data.expiration && now < data.expiration) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'NexTrade Signal',
      message: 'Signal de trading: tendance haussière détectée 📈',
      priority: 2
    });
  } else {
    console.log("Licence inactive ou expirée.");
  }
}

// Toutes les 60 secondes, vérifie licence et affiche notification si active
setInterval(checkLicenseAndNotify, 60000);
