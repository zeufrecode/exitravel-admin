// Import Firebase via CDN (obligatoire dans un service worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Remplace par TON firebaseConfig
firebase.initializeApp({
  apiKey: "AIzaSyC7WmDVfC5h6cgYB4S0xTaoV91UUN7ZCDs",
  authDomain: "exitravels-6bd53.firebaseapp.com",
  projectId: "exitravels-6bd53",
  storageBucket: "exitravels-6bd53.firebasestorage.app",
  messagingSenderId: "1078453124578",
  appId: "1:1078453124578:web:5eae6807c61cad953dcdbb"
});

// Récupère le messaging
const messaging = firebase.messaging();

// Notification quand l'app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nouvelle réservation';
  const notificationOptions = {
    body: payload.notification?.body || 'Une nouvelle demande a été reçue.',
    icon: '/icon-192.png',
    click_action: self.registration.scope // Ouvre l'app
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});