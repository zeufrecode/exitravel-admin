'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { format, startOfWeek, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowDownTrayIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ClockIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ========================
// TYPES
// ========================

type Reservation = {
  id: string;
  tripType: 'round' | 'oneWay' | 'multi';
  travelers: { adultes: number; enfants: number; bebes: number };
  flights: Array<{
    from: string;
    to: string;
    fromIata: string;
    toIata: string;
    departureDate: any;
    returnDate?: any;
    cabinClass: string;
  }>;
  contact: { nom: string; prenom: string; email: string; telephone: string };
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
};

type Message = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  message: string;
  createdAt: any;
};

// ========================
// CONSTANTES
// ========================

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  rejected: 'Rejeté',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const TRIP_TYPE_LABELS: Record<string, string> = {
  round: 'Aller-retour',
  oneWay: 'Aller simple',
  multi: 'Multiville',
};
const CABIN_LABELS: Record<string, string> = {
  eco: 'Éco',
  ecoPremium: 'Éco Premium',
  business: 'Business',
  first: 'Première',
};

// ========================
// UTILS
// ========================

const exportToCSV = (reservations: Reservation[]) => {
  if (reservations.length === 0) return;

  const headers = [
    'ID',
    'Date',
    'Client (Nom)',
    'Client (Prénom)',
    'Email',
    'Téléphone',
    'Type de voyage',
    'Statut',
    'Voyageurs (Adultes/Enfants/Bébés)',
    'Détail des vols (Départ → Destination | Classe | Date)',
  ];

  const rows = reservations.map((res) => {
    const createdAt = res.createdAt?.toDate?.();
    const date = createdAt ? format(createdAt, 'dd/MM/yyyy', { locale: fr }) : '';
    const travelers = `${res.travelers.adultes}/${res.travelers.enfants}/${res.travelers.bebes}`;
    const flightsDetail = res.flights
      .map((f) => {
        const depDate = f.departureDate?.toDate?.();
        const depDateStr = depDate ? format(depDate, 'dd/MM/yyyy', { locale: fr }) : '';
        const cls = CABIN_LABELS[f.cabinClass] || f.cabinClass;
        return `${f.from} → ${f.to} | ${cls} | ${depDateStr}`;
      })
      .join(' ; ');

    return [
      res.id,
      date,
      res.contact.nom,
      res.contact.prenom,
      res.contact.email,
      res.contact.telephone,
      TRIP_TYPE_LABELS[res.tripType] || res.tripType,
      STATUS_LABELS[res.status] || res.status,
      travelers,
      `"${flightsDetail}"`,
    ]
      .map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`)
      .join(';');
  });

  const csvContent = ['\uFEFF' + headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `reservations_exitravels_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const StatCard = ({ title, value, icon: Icon, color = 'bg-blue-100 text-blue-800' }: any) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-current" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const TopDestinations = ({ reservations }: { reservations: Reservation[] }) => {
  const destinations = useMemo(() => {
    const count: Record<string, number> = {};
    reservations.forEach((res) => {
      res.flights.forEach((flight) => {
        const dest = flight.to || 'Inconnue';
        count[dest] = (count[dest] || 0) + 1;
      });
    });
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reservations]);

  if (destinations.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <GlobeAltIcon className="h-5 w-5 text-gray-900" />
        Top destinations
      </h3>
      <ul className="space-y-2">
        {destinations.map(([dest, count]) => (
          <li key={dest} className="flex justify-between text-sm">
            <span className="text-gray-700">{dest}</span>
            <span className="font-medium text-gray-900">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ========================
// COMPOSANT PRINCIPAL
// ========================

export default function AdminDashboard() {
  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Réservations
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'tripType' | 'destination' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // UI
  const [activeTab, setActiveTab] = useState<'reservations' | 'messages'>('reservations');
  const [isCollapsed, setIsCollapsed] = useState(false); // ✅ Sidebar pliable sur desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✅ Mobile menu

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevReservationsLength = useRef(0);
  const prevMessagesLength = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fermer sidebar mobile au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSidebarOpen]);

  // Auth & Firestore listeners
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const reservationsUnsub = onSnapshot(
      query(collection(db, 'reservations'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
        if (data.length > prevReservationsLength.current && prevReservationsLength.current > 0) {
          if (audioRef.current) audioRef.current.play().catch(() => {});
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('🆕 Nouvelle réservation !', {
              body: 'Une demande a été reçue.',
              icon: '/icon-192.png',
            });
          }
        }
        prevReservationsLength.current = data.length;
        setReservations(data);
        setLoadingReservations(false);
      }
    );

    const messagesUnsub = onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
        if (data.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
          if (audioRef.current) audioRef.current.play().catch(() => {});
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('📩 Nouveau message de contact !', {
              body: 'Un client vient de vous contacter.',
              icon: '/icon-192.png',
            });
          }
        }
        prevMessagesLength.current = data.length;
        setMessages(data);
        setLoadingMessages(false);
      }
    );

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then(() => {
        const messaging = getMessaging();
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '' }).catch(console.error);
          }
        });
        onMessage(messaging, (payload) => {
          new Notification(payload.notification?.title || 'Nouveau message', {
            body: payload.notification?.body || 'Un message a été reçu.',
            icon: '/icon-192.png',
          });
        });
      });
    }

    return () => {
      reservationsUnsub();
      messagesUnsub();
    };
  }, [user]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setLoginError('Email ou mot de passe incorrect.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
      if (selectedReservation?.id === id) setSelectedReservation({ ...selectedReservation, status });
    } catch (err) {
      console.error(err);
    }
  };

  // Logique filtres / stats
  const sortedAndFilteredReservations = useMemo(() => {
    let filtered = [...reservations];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (res) =>
          res.contact.nom.toLowerCase().includes(q) ||
          res.contact.prenom.toLowerCase().includes(q) ||
          res.contact.email.toLowerCase().includes(q) ||
          res.flights.some((f) => f.to.toLowerCase().includes(q) || f.from.toLowerCase().includes(q))
      );
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter((res) => {
        const createdAt = res.createdAt?.toDate?.();
        if (!createdAt) return false;
        const createdAtDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        if (fromDate && createdAtDate < fromDate) return false;
        if (toDate && createdAtDate > toDate) return false;
        return true;
      });
    }

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'date':
          aValue = a.createdAt?.toDate?.() || new Date(0);
          bValue = b.createdAt?.toDate?.() || new Date(0);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'tripType':
          aValue = a.tripType;
          bValue = b.tripType;
          break;
        case 'destination':
          aValue = a.flights[0]?.to?.toLowerCase() || '';
          bValue = b.flights[0]?.to?.toLowerCase() || '';
          break;
        case 'client':
          aValue = (a.contact.prenom + ' ' + a.contact.nom).toLowerCase();
          bValue = (b.contact.prenom + ' ' + b.contact.nom).toLowerCase();
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reservations, sortBy, sortOrder, searchQuery, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = reservations.length;
    const thisWeek = reservations.filter(
      (res) => res.createdAt?.toDate && isSameWeek(res.createdAt.toDate(), now, { weekStartsOn: 1 })
    ).length;
    const pending = reservations.filter((r) => r.status === 'pending').length;
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length;
    const rejected = reservations.filter((r) => r.status === 'rejected').length;
    return { total, thisWeek, pending, confirmed, rejected };
  }, [reservations]);

  // ========================
  // RENDER
  // ========================

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ff781d]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          <div className="text-center mb-6">
            <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Cog6ToothIcon className="h-8 w-8 text-[#ff781d]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Admin</h1>
            <p className="text-gray-500">Exitravel — Gestion professionnelle</p>
          </div>
          {loginError && <p className="text-red-600 text-center mb-4">{loginError}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ff781d] outline-none"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ff781d] outline-none"
              required
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#ff781d] to-orange-600 text-white py-3 rounded-xl font-semibold hover:opacity-95 transition shadow"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 🔸 SIDEBAR DESKTOP (pliable) */}
      <div
        className={`hidden md:flex flex-col bg-white shadow-md border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Exitravel Pro</h2>
              <p className="text-xs text-gray-500">Tableau de bord</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-800 p-1 rounded-md hover:bg-gray-100"
            aria-label={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              activeTab === 'reservations'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5" />
            {!isCollapsed && <span>Réservations ({reservations.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              activeTab === 'messages'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            {!isCollapsed && <span>Messages ({messages.length})</span>}
          </button>
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            {!isCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* 🔸 OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* 🔸 SIDEBAR MOBILE */}
      {/* 🔸 SIDEBAR MOBILE — Pleine largeur */}
<div
  ref={sidebarRef}
  className={`fixed md:hidden z-50 bottom-0 top-0 ${
    isSidebarOpen ? 'right-0' : '-right-full'
  } w-[95%] max-w-sm bg-white shadow-2xl border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out rounded-l-2xl`}
>
  <div className="p-5 border-b border-gray-200 flex justify-between items-center">
    <div>
      <h2 className="text-lg font-bold text-gray-900">Exitravel Pro</h2>
      <p className="text-xs text-gray-500">Tableau de bord</p>
    </div>
    <button
      onClick={() => setIsSidebarOpen(false)}
      className="text-gray-500 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-100"
      aria-label="Fermer le menu"
    >
      <XMarkIcon className="h-6 w-6" />
    </button>
  </div>
  <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
    <button
      onClick={() => {
        setActiveTab('reservations');
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition ${
        activeTab === 'reservations'
          ? 'bg-orange-100 text-[#ff781d] font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <DocumentTextIcon className="h-5 w-5" />
      <span>Réservations ({reservations.length})</span>
    </button>
    <button
      onClick={() => {
        setActiveTab('messages');
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition ${
        activeTab === 'messages'
          ? 'bg-orange-100 text-[#ff781d] font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <ChatBubbleLeftRightIcon className="h-5 w-5" />
      <span>Messages ({messages.length})</span>
    </button>
  </nav>
  <div className="p-4 border-t border-gray-200">
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-gray-100 rounded-xl transition"
    >
      <ArrowLeftOnRectangleIcon className="h-5 w-5" />
      <span>Déconnexion</span>
    </button>
  </div>
</div>

      {/* 🔸 CONTENU PRINCIPAL */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <audio ref={audioRef} src="/notification.mp3" />

        {/* 🔸 MOBILE MENU BUTTON */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
          aria-label="Ouvrir le menu"
        >
          <Bars3Icon className="h-6 w-6 text-gray-700" />
        </button>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'reservations' ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <DocumentTextIcon className="h-8 w-8 text-[#ff781d]" />
                    Réservations
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Historique complet, jamais perdu.</p>
                </div>
                <button
                  onClick={() => exportToCSV([...sortedAndFilteredReservations])} // ✅ Spread pour garantir array
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition shadow-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard title="Total" value={stats.total} icon={DocumentTextIcon} color="bg-indigo-100 text-indigo-800" />
                <StatCard title="Cette semaine" value={stats.thisWeek} icon={CalendarIcon} color="bg-purple-100 text-purple-800" />
                <StatCard title="En attente" value={stats.pending} icon={ClockIcon} color="bg-yellow-100 text-yellow-800" />
                <StatCard title="Confirmées" value={stats.confirmed} icon={CheckCircleIcon} color="bg-green-100 text-green-800" />
                <StatCard title="Rejetées" value={stats.rejected} icon={XCircleIcon} color="bg-red-100 text-red-800" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="lg:col-span-3">
                  <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4 flex-wrap items-start md:items-center">
                      <input
                        type="text"
                        placeholder="Rechercher (client, destination...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
                      />
                      <div className="flex gap-2 w-full md:w-auto">
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
                        />
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
                        >
                          <option value="date">Trier par date</option>
                          <option value="status">Statut</option>
                          <option value="tripType">Type de voyage</option>
                          <option value="destination">Destination</option>
                          <option value="client">Client</option>
                        </select>
                        <select
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value as any)}
                          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
                        >
                          <option value="desc">↓ Récent</option>
                          <option value="asc">↑ Ancien</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {loadingReservations ? (
                    <div className="bg-white rounded-2xl shadow border border-gray-200 p-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff781d] mx-auto"></div>
                      <p className="mt-4 text-gray-600">Chargement...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl shadow border border-gray-200">
                      <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
                        {sortedAndFilteredReservations.length} réservation{sortedAndFilteredReservations.length > 1 ? 's' : ''} affichée{sortedAndFilteredReservations.length > 1 ? 's' : ''}
                      </div>
                      <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Destination</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {sortedAndFilteredReservations.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                                Aucune réservation trouvée.
                              </td>
                            </tr>
                          ) : (
                            sortedAndFilteredReservations.map((res) => (
                              <tr
                                key={res.id}
                                onClick={() => setSelectedReservation(res)}
                                className="hover:bg-orange-50 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-4">
                                  <div className="font-medium text-gray-900">{res.contact.prenom} {res.contact.nom}</div>
                                  <div className="text-gray-500">{res.contact.email}</div>
                                </td>
                                <td className="px-4 py-4 text-gray-800">{TRIP_TYPE_LABELS[res.tripType]}</td>
                                <td className="px-4 py-4 text-gray-800">{res.flights[0]?.to || '—'}</td>
                                <td className="px-4 py-4 text-gray-600">
                                  {res.createdAt?.toDate
                                    ? format(res.createdAt.toDate(), 'dd MMM yyyy', { locale: fr })
                                    : '—'}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${STATUS_COLORS[res.status]}`}>
                                    {STATUS_LABELS[res.status]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <TopDestinations reservations={reservations} />
                </div>
              </div>

              {/* MODALE RÉSERVATION */}
              {selectedReservation && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="reservation-modal-title"
                  className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/40 backdrop-blur-sm"
                  onClick={() => setSelectedReservation(null)}
                >
                  <div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-auto mt-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h2 id="reservation-modal-title" className="text-xl md:text-2xl font-bold text-gray-900">
                            Détails de la réservation
                          </h2>
                          <p className="text-gray-500 text-sm">ID : {selectedReservation.id}</p>
                        </div>
                        <button
                          onClick={() => setSelectedReservation(null)}
                          className="text-gray-400 hover:text-gray-700 rounded-full p-1.5 hover:bg-gray-100 transition"
                          aria-label="Fermer"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selectedReservation.status]}`}>
                          {STATUS_LABELS[selectedReservation.status]}
                        </span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => updateStatus(selectedReservation.id, 'confirmed')}
                            disabled={selectedReservation.status !== 'pending'}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                              selectedReservation.status !== 'pending'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Confirmer
                          </button>
                          <button
                            onClick={() => updateStatus(selectedReservation.id, 'rejected')}
                            disabled={selectedReservation.status !== 'pending'}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                              selectedReservation.status !== 'pending'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            <XCircleIcon className="h-4 w-4" />
                            Rejeter
                          </button>
                        </div>
                      </div>

                      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <UserIcon className="h-5 w-5 text-gray-900" /> Informations client
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <p><span className="font-medium text-gray-900">Nom :</span> {selectedReservation.contact.nom}</p>
                          <p><span className="font-medium text-gray-900">Prénom :</span> {selectedReservation.contact.prenom}</p>
                          <p><span className="font-medium text-gray-900">Email :</span> {selectedReservation.contact.email}</p>
                          <p><span className="font-medium text-gray-900">Téléphone :</span> {selectedReservation.contact.telephone}</p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPinIcon className="h-5 w-5 text-gray-900" /> Détails du voyage
                        </h3>
                        <p className="mb-3 text-gray-900"><span className="font-medium">Type :</span> {TRIP_TYPE_LABELS[selectedReservation.tripType]}</p>

                        {selectedReservation.tripType === 'multi' ? (
                          <div className="mb-3">
                            <span className="font-medium text-gray-900">Classes :</span>
                            <ul className="mt-1 space-y-1">
                              {selectedReservation.flights.map((flight, idx) => (
                                <li key={idx} className="text-sm text-gray-900">
                                  • {flight.from} → {flight.to}: <span className="font-medium">{CABIN_LABELS[flight.cabinClass]}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="mb-3 text-gray-900">
                            <span className="font-medium">Classe :</span>{' '}
                            {CABIN_LABELS[selectedReservation.flights[0]?.cabinClass] || '—'}
                          </p>
                        )}

                        <p className="mb-4 text-gray-900">
                          <span className="font-medium">Voyageurs :</span>
                          {selectedReservation.travelers.adultes > 0 && ` ${selectedReservation.travelers.adultes} adulte(s)`}
                          {selectedReservation.travelers.enfants > 0 && `, ${selectedReservation.travelers.enfants} enfant(s)`}
                          {selectedReservation.travelers.bebes > 0 && `, ${selectedReservation.travelers.bebes} bébé(s)`}
                        </p>

                        <div className="space-y-4">
                          {selectedReservation.flights.map((flight, idx) => (
                            <div key={idx} className="p-4 border-l-4 border-[#ff781d] bg-white rounded-r-lg shadow-sm">
                              <p className="text-gray-900"><span className="font-medium">Départ :</span> {flight.from} ({flight.fromIata})</p>
                              <p className="text-gray-900"><span className="font-medium">Destination :</span> {flight.to} ({flight.toIata})</p>
                              <p className="text-gray-900">
                                <span className="font-medium">Départ le :</span>{' '}
                                {flight.departureDate?.toDate
                                  ? format(flight.departureDate.toDate(), 'dd MMM yyyy', { locale: fr })
                                  : '—'}
                              </p>
                              {flight.returnDate && (
                                <p className="text-gray-900">
                                  <span className="font-medium">Retour le :</span>{' '}
                                  {format(flight.returnDate.toDate(), 'dd MMM yyyy', { locale: fr })}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-[#ff781d]" />
                    Messages de contact
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Reçus depuis le site exitravel.net</p>
                </div>
              </div>

              {loadingMessages ? (
                <div className="bg-white rounded-2xl shadow border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff781d] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Chargement des messages...</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
                    {messages.length} message{messages.length > 1 ? 's' : ''}
                  </div>
                  <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">Aucun message pour le moment.</div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className="p-5 hover:bg-orange-50 cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {msg.prenom} {msg.nom}
                              </h3>
                              <p className="text-sm text-gray-600">{msg.email}</p>
                              {msg.telephone && (
                                <p className="text-sm text-gray-600">{msg.telephone}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap mt-1 md:mt-0">
                              {msg.createdAt?.toDate
                                ? format(msg.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr })
                                : '—'}
                            </span>
                          </div>
                          <p className="mt-3 text-gray-800 whitespace-pre-line">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* MODALE MESSAGE */}
              {selectedMessage && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="message-modal-title"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                  onClick={() => setSelectedMessage(null)}
                >
                  <div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h2 id="message-modal-title" className="text-xl font-bold text-gray-900">
                          Message de {selectedMessage.prenom} {selectedMessage.nom}
                        </h2>
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="text-gray-400 hover:text-gray-700 rounded-full p-1.5 hover:bg-gray-100 transition"
                          aria-label="Fermer"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-gray-900">{selectedMessage.email}</p>
                        </div>
                        {selectedMessage.telephone && (
                          <div>
                            <p className="text-sm text-gray-500">Téléphone</p>
                            <p className="text-gray-900">{selectedMessage.telephone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Message</p>
                          <p className="text-gray-900 whitespace-pre-line">{selectedMessage.message}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          Reçu le :{' '}
                          {selectedMessage.createdAt?.toDate
                            ? format(selectedMessage.createdAt.toDate(), 'dd/MM/yyyy à HH:mm', { locale: fr })
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <footer className="mt-8 text-center text-gray-500 text-sm">
            ✈️ Exitravel — Tableau de bord professionnel. Historique jamais perdu.
          </footer>
        </div>
      </div>
    </div>
  );
}