'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { format, isSameWeek } from 'date-fns';
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
  ArchiveBoxIcon,
  TrashIcon,
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
  isDeleted?: boolean;
};

type Message = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  message: string;
  createdAt: any;
  isDeleted?: boolean;
  isRead?: boolean; // ✨ champ ajouté
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
// COMPOSANTS MODERNES
// ========================
const ContactBadge = ({
  type,
  value,
  link,
}: {
  type: 'email' | 'phone';
  value: string;
  link: string;
}) => (
  <a
    href={link}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
      type === 'email'
        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
        : 'bg-green-50 text-green-700 hover:bg-green-100'
    } border border-transparent hover:border-current`}
  >
    {type === 'email' ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )}
    {value}
  </a>
);

const ContactActions = ({ email, phone }: { email: string; phone?: string }) => (
  <div className="flex gap-2 pt-3">
    <a
      href={`mailto:${email}`}
      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 font-medium text-sm transition shadow-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      Répondre
    </a>
    {phone && (
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Appeler
      </a>
    )}
  </div>
);

const UnifiedModal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-auto mt-8 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 rounded-full p-1.5 hover:bg-gray-100 transition"
              aria-label="Fermer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="mb-6">{children}</div>
          {actions && <div className="pt-2 border-t border-gray-100">{actions}</div>}
        </div>
      </div>
    </div>
  );
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
  // Données
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deletedReservations, setDeletedReservations] = useState<Reservation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Message[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  // Sélection
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  // UI
  const [activeTab, setActiveTab] = useState<'reservations' | 'messages' | 'trash'>('reservations');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'tripType' | 'destination' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevReservationsLength = useRef(0);
  const prevMessagesLength = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  // Auth & Firestore
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
        const allRes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
        setReservations(allRes.filter(r => !r.isDeleted));
        setDeletedReservations(allRes.filter(r => r.isDeleted));
        setLoadingReservations(false);
        if (allRes.filter(r => !r.isDeleted).length > prevReservationsLength.current && prevReservationsLength.current > 0) {
          if (audioRef.current) audioRef.current.play().catch(() => {});
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('🆕 Nouvelle réservation !', { body: 'Une demande a été reçue.', icon: '/icon-192.png' });
          }
        }
        prevReservationsLength.current = allRes.filter(r => !r.isDeleted).length;
      }
    );
    const messagesUnsub = onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const allMsg = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
        setMessages(allMsg.filter(m => !m.isDeleted));
        setDeletedMessages(allMsg.filter(m => m.isDeleted));
        setLoadingMessages(false);
        if (allMsg.filter(m => !m.isDeleted).length > prevMessagesLength.current && prevMessagesLength.current > 0) {
          if (audioRef.current) audioRef.current.play().catch(() => {});
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('📩 Nouveau message de contact !', { body: 'Un client vient de vous contacter.', icon: '/icon-192.png' });
          }
        }
        prevMessagesLength.current = allMsg.filter(m => !m.isDeleted).length;
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

  // ========================
  // HANDLERS
  // ========================
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

  const softDeleteReservation = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { isDeleted: true });
      setToast({ message: 'Réservation déplacée vers la corbeille.', type: 'success' });
      setSelectedReservation(null);
    } catch (err) {
      setToast({ message: 'Erreur lors de la mise à la corbeille.', type: 'error' });
      console.error(err);
    }
  };

  const softDeleteMessage = async (id: string) => {
    try {
      await updateDoc(doc(db, 'messages', id), { isDeleted: true });
      setToast({ message: 'Message déplacé vers la corbeille.', type: 'success' });
      setSelectedMessage(null);
    } catch (err) {
      setToast({ message: 'Erreur lors de la mise à la corbeille.', type: 'error' });
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'messages', id), { isRead: true });
    } catch (err) {
      console.error('Erreur marquage lu :', err);
    }
  };

  // ========================
  // LOGIQUE FILTRES
  // ========================
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
    <div className="flex min-h-screen bg-gray-50 relative">
      {/* 🔸 TOAST */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-white font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
          style={{ animation: 'fadeInOut 3s forwards' }}
        >
          {toast.message}
        </div>
      )}

      {/* 🔸 SIDEBAR DESKTOP */}
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
            aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => {
              setActiveTab('reservations');
              setIsSidebarOpen(false);
            }}
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
            onClick={() => {
              setActiveTab('messages');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              activeTab === 'messages'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            {!isCollapsed && <span>Messages ({messages.length})</span>}
          </button>
          <button
            onClick={() => {
              setActiveTab('trash');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              activeTab === 'trash'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArchiveBoxIcon className="h-5 w-5" />
            {!isCollapsed && (
              <span>
                Corbeille ({deletedReservations.length + deletedMessages.length})
              </span>
            )}
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

      {/* 🔸 MOBILE MENU BUTTON */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        <Bars3Icon className="h-6 w-6 text-gray-700" />
      </button>

      {/* 🔸 OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* 🔸 SIDEBAR MOBILE */}
      <div
        ref={sidebarRef}
        className={`fixed md:hidden z-50 top-0 left-0 h-full w-[280px] max-w-[90vw] bg-white shadow-xl border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Exitravel Pro</h2>
          <p className="text-xs text-gray-500">Tableau de bord</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('reservations');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'reservations'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5" />
            Réservations ({reservations.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('messages');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'messages'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Messages ({messages.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('trash');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'trash'
                ? 'bg-orange-100 text-[#ff781d] font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArchiveBoxIcon className="h-5 w-5" />
            Corbeille ({deletedReservations.length + deletedMessages.length})
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* 🔸 CONTENU PRINCIPAL */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <audio ref={audioRef} src="/notification.mp3" />
        <div className="max-w-7xl mx-auto">
          {/* RÉSERVATIONS */}
          {activeTab === 'reservations' && (
  <>
    {/* HEADER */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="h-8 w-8 text-[#ff781d]" />
          Réservations
        </h1>
        <p className="text-gray-500 text-sm mt-1">Historique complet, jamais perdu.</p>
      </div>

      <button
        onClick={() => exportToCSV([...sortedAndFilteredReservations])}
        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition shadow-sm"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Export CSV
      </button>
    </div>

    {/* STATS — mobile grid optimisée */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      <StatCard title="Total" value={stats.total} icon={DocumentTextIcon} color="bg-indigo-100 text-indigo-800" />
      <StatCard title="Cette semaine" value={stats.thisWeek} icon={CalendarIcon} color="bg-purple-100 text-purple-800" />
      <StatCard title="En attente" value={stats.pending} icon={ClockIcon} color="bg-yellow-100 text-yellow-800" />
      <StatCard title="Confirmées" value={stats.confirmed} icon={CheckCircleIcon} color="bg-green-100 text-green-800" />
      <StatCard title="Rejetées" value={stats.rejected} icon={XCircleIcon} color="bg-red-100 text-red-800" />
    </div>

    {/* FILTRES — Full responsive */}
    <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6">
      <input
        type="text"
        placeholder="Rechercher (client, destination...)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
      />

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
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
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ff781d] outline-none"
        >
          <option value="desc">↓ Récent</option>
          <option value="asc">↑ Ancien</option>
        </select>
      </div>
    </div>

    {/* CONTENT */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      <div className="lg:col-span-3">
        {loadingReservations ? (
          <div className="bg-white rounded-2xl shadow border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff781d] mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow border border-gray-200">
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
              {sortedAndFilteredReservations.length} réservation
              {sortedAndFilteredReservations.length > 1 ? 's' : ''} affichée
              {sortedAndFilteredReservations.length > 1 ? 's' : ''}.
            </div>

            {/* TABLE — scroll mobile */}
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Statut</th>
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
                        <div className="font-medium text-gray-900">
                          {res.contact.prenom} {res.contact.nom}
                        </div>
                        <div className="text-gray-500 text-xs">{res.contact.email}</div>
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

    {/* MODALE — parfaitement responsive */}
    {selectedReservation && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-4 bg-black/40 backdrop-blur-sm"
        onClick={() => setSelectedReservation(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto mt-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 sm:p-6">

            {/* MODAL HEADER */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Détails de la réservation</h2>
                <p className="text-gray-500 text-sm">ID : {selectedReservation.id}</p>
              </div>

              <button
                onClick={() => setSelectedReservation(null)}
                className="text-gray-400 hover:text-gray-700 rounded-full p-1.5 hover:bg-gray-100 transition"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* BADGES */}
            <div className="mb-4 flex flex-wrap gap-2">
              <ContactBadge type="email" value={selectedReservation.contact.email} link={`mailto:${selectedReservation.contact.email}`} />
              {selectedReservation.contact.telephone && (
                <ContactBadge type="phone" value={selectedReservation.contact.telephone} link={`tel:${selectedReservation.contact.telephone.replace(/\s+/g, '')}`} />
              )}
            </div>

            {/* STATUS + ACTIONS */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-start sm:items-center mb-6 p-4 bg-gray-50 rounded-xl">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selectedReservation.status]}`}>
                {STATUS_LABELS[selectedReservation.status]}
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateStatus(selectedReservation.id, 'confirmed')}
                  disabled={selectedReservation.status !== 'pending'}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedReservation.status !== 'pending'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <XCircleIcon className="h-4 w-4" />
                  Rejeter
                </button>

                <button
                  onClick={() => softDeleteReservation(selectedReservation.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                >
                  <TrashIcon className="h-4 w-4" />
                  Corbeille
                </button>
              </div>
            </div>

            {/* INFOS CLIENT */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserIcon className="h-5 w-5" /> Informations client
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <p><span className="font-medium">Nom :</span> {selectedReservation.contact.nom}</p>
                <p><span className="font-medium">Prénom :</span> {selectedReservation.contact.prenom}</p>
              </div>
            </div>

            {/* DÉTAILS VOYAGE */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" /> Détails du voyage
              </h3>

              <p className="mb-3"><span className="font-medium">Type :</span> {TRIP_TYPE_LABELS[selectedReservation.tripType]}</p>

              {/* MULTI VOL */}
              {selectedReservation.tripType === 'multi' ? (
                <div className="mb-3">
                  <span className="font-medium">Classes :</span>
                  <ul className="mt-1 space-y-1 text-sm">
                    {selectedReservation.flights.map((flight, idx) => (
                      <li key={idx}>
                        • {flight.from} → {flight.to}:{' '}
                        <span className="font-medium">{CABIN_LABELS[flight.cabinClass]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mb-3">
                  <span className="font-medium">Classe :</span>{' '}
                  {CABIN_LABELS[selectedReservation.flights[0]?.cabinClass] || '—'}
                </p>
              )}

              <p className="mb-4">
                <span className="font-medium">Voyageurs :</span>
                {selectedReservation.travelers.adultes > 0 && ` ${selectedReservation.travelers.adultes} adulte(s)`}
                {selectedReservation.travelers.enfants > 0 && `, ${selectedReservation.travelers.enfants} enfant(s)`}
                {selectedReservation.travelers.bebes > 0 && `, ${selectedReservation.travelers.bebes} bébé(s)`}
              </p>

              <div className="space-y-4">
                {selectedReservation.flights.map((flight, idx) => (
                  <div key={idx} className="p-4 border-l-4 border-[#ff781d] bg-white rounded-r-lg shadow-sm">
                    <p><span className="font-medium">Départ :</span> {flight.from} ({flight.fromIata})</p>
                    <p><span className="font-medium">Destination :</span> {flight.to} ({flight.toIata})</p>
                    <p>
                      <span className="font-medium">Départ le :</span>{' '}
                      {flight.departureDate?.toDate
                        ? format(flight.departureDate.toDate(), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </p>

                    {flight.returnDate && (
                      <p>
                        <span className="font-medium">Retour le :</span>{' '}
                        {format(flight.returnDate.toDate(), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <ContactActions
              email={selectedReservation.contact.email}
              phone={selectedReservation.contact.telephone}
            />
          </div>
        </div>
      </div>
    )}
  </>
)}


          {/* MESSAGES */}
          {activeTab === 'messages' && (
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
                          onClick={() => {
                            if (!msg.isRead) markAsRead(msg.id);
                            setSelectedMessage(msg);
                          }}
                          className="p-5 hover:bg-orange-50 cursor-pointer transition-colors"
                        >
                          <div className="flex flex-wrap items-start gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {!msg.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#ff781d]"></span>
                              )}
                              <h3 className="font-semibold text-gray-900">{msg.prenom} {msg.nom}</h3>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {msg.createdAt?.toDate
                                ? format(msg.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: fr })
                                : '—'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <ContactBadge type="email" value={msg.email} link={`mailto:${msg.email}`} />
                            {msg.telephone && (
                              <ContactBadge type="phone" value={msg.telephone} link={`tel:${msg.telephone.replace(/\s+/g, '')}`} />
                            )}
                          </div>
                          <p className="text-gray-800 whitespace-pre-line line-clamp-2">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {/* MODAL UNIFIÉ POUR MESSAGE */}
              <UnifiedModal
                isOpen={!!selectedMessage}
                onClose={() => setSelectedMessage(null)}
                title={`Message de ${selectedMessage?.prenom} ${selectedMessage?.nom}`}
                children={
                  selectedMessage ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Message</p>
                          <p className="text-gray-900 whitespace-pre-line">{selectedMessage.message}</p>
                        </div>
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          Reçu le :{' '}
                          {selectedMessage.createdAt?.toDate
                            ? format(selectedMessage.createdAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr })
                            : '—'}
                        </div>
                      </div>
                    </>
                  ) : null
                }
                actions={
                  selectedMessage ? <ContactActions email={selectedMessage.email} phone={selectedMessage.telephone} /> : null
                }
              />
            </>
          )}

          {/* CORBEILLE */}
          {activeTab === 'trash' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <ArchiveBoxIcon className="h-8 w-8 text-[#ff781d]" />
                  Corbeille
                </h1>
                <p className="text-gray-600">
                  {deletedReservations.length + deletedMessages.length} élément{deletedReservations.length + deletedMessages.length !== 1 ? 's' : ''} supprimé{deletedReservations.length + deletedMessages.length !== 1 ? 's' : ''}
                </p>
              </div>
              {/* Réservations supprimées */}
              {deletedReservations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Réservations supprimées</h2>
                  <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Client</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {deletedReservations.map((res) => (
                          <tr key={res.id}>
                            <td className="px-4 py-3">{res.contact.prenom} {res.contact.nom}</td>
                            <td className="px-4 py-3">
                              {res.createdAt?.toDate ? format(res.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateDoc(doc(db, 'reservations', res.id), { isDeleted: false })}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Restaurer
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('⚠️ Supprimer définitivement ? Cette action est irréversible.')) {
                                      try {
                                        await deleteDoc(doc(db, 'reservations', res.id));
                                        setToast({ message: 'Supprimé définitivement.', type: 'success' });
                                      } catch (err) {
                                        setToast({ message: 'Erreur.', type: 'error' });
                                      }
                                    }
                                  }}
                                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Messages supprimés */}
              {deletedMessages.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Messages supprimés</h2>
                  <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Expéditeur</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Aperçu</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {deletedMessages.map((msg) => (
                          <tr key={msg.id}>
                            <td className="px-4 py-3">{msg.prenom} {msg.nom}</td>
                            <td className="px-4 py-3">
                              {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : '—'}
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate">{msg.message.substring(0, 50)}...</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateDoc(doc(db, 'messages', msg.id), { isDeleted: false })}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Restaurer
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('⚠️ Supprimer définitivement ?')) {
                                      try {
                                        await deleteDoc(doc(db, 'messages', msg.id));
                                        setToast({ message: 'Supprimé définitivement.', type: 'success' });
                                      } catch (err) {
                                        setToast({ message: 'Erreur.', type: 'error' });
                                      }
                                    }
                                  }}
                                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {deletedReservations.length === 0 && deletedMessages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  La corbeille est vide.
                </div>
              )}
            </div>
          )}

          <footer className="mt-8 text-center text-gray-500 text-sm">
            ✈️ Exitravel — Tableau de bord professionnel. Historique jamais perdu.
          </footer>
        </div>
      </div>

      {/* 🔸 ANIMATION TOAST */}
      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(10px); }
        }
      `}</style>
    </div>
  );
}