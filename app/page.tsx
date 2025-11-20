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
  TagIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ClockIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

// ===== TYPES & CONSTANTS =====
// (inchangés – garde ton code existant ici)

type Reservation = { /* ... */ };
type Message = { /* ... */ };

const STATUS_LABELS = { /* ... */ };
const STATUS_COLORS = { /* ... */ };
const TRIP_TYPE_LABELS = { /* ... */ };
const CABIN_LABELS = { /* ... */ };

// ===== UTILS =====
const exportToCSV = (reservations: Reservation[]) => { /* ... */ };

const StatCard = ({ title, value, icon: Icon, color = 'bg-blue-100 text-blue-800' }: any) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const TopDestinations = ({ reservations }: { reservations: Reservation[] }) => {
  // (inchangé)
};

// ===== COMPOSANT PRINCIPAL =====
export default function AdminDashboard() {
  // === États existants ===
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'tripType' | 'destination' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const [activeTab, setActiveTab] = useState<'reservations' | 'messages'>('reservations');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevReservationsLength = useRef(0);
  const prevMessagesLength = useRef(0);

  // === Fermer sidebar au clic extérieur ===
  const sidebarRef = useRef<HTMLDivElement>(null);
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

  // === Effets Firebase ===
  // (inchangés – garde ton useEffect avec onAuthStateChanged et onSnapshot)

  // === Handlers ===
  const handleLogin = async (e: React.FormEvent) => { /* ... */ };
  const handleLogout = async () => { /* ... */ };
  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => { /* ... */ };

  // === Logique filtres ===
  const sortedAndFilteredReservations = useMemo(() => { /* ... */ }, [reservations, sortBy, sortOrder, searchQuery, dateFrom, dateTo]);
  const stats = useMemo(() => { /* ... */ }, [reservations]);

  // === RENDU ===
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* ===== SIDEBAR ===== */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      <div
        ref={sidebarRef}
        className={`fixed md:static z-50 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Exitravel Pro</h2>
          <p className="text-xs text-gray-500">Tableau de bord</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
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

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <audio ref={audioRef} src="/notification.mp3" />

        {/* ===== MOBILE MENU BUTTON ===== */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
          aria-label="Ouvrir le menu"
        >
          <Bars3Icon className="h-6 w-6 text-gray-700" />
        </button>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'reservations' ? (
            // === SECTION RÉSERVATIONS ===
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <DocumentTextIcon className="h-8 w-8 text-[#ff781d]" />
                    Réservations
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Historique complet, jamais perdu.</p>
                </div>
                <button
                  onClick={() => exportToCSV(sortedAndFilteredReservations)}
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
                            <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">Aucune réservation trouvée.</td></tr>
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

              {/* === MODAL RÉSERVATION === */}
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
                          <h2 id="reservation-modal-title" className="text-xl md:text-2xl font-bold text-gray-900">Détails de la réservation</h2>
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
                      {/* ... contenu modal inchangé ... */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // === SECTION MESSAGES ===
            <div>
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
                  <p className="mt-4 text-gray-600">Chargement...</p>
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
                              <h3 className="font-bold text-gray-900">{msg.prenom} {msg.nom}</h3>
                              <p className="text-sm text-gray-600">{msg.email}</p>
                              {msg.telephone && <p className="text-sm text-gray-600">{msg.telephone}</p>}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap mt-1 md:mt-0">
                              {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                            </span>
                          </div>
                          <p className="mt-3 text-gray-800 whitespace-pre-line">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* === MODAL MESSAGE === */}
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
                      {/* ... contenu modal inchangé ... */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <footer className="mt-8 text-center text-gray-500 text-sm">
            ✈️ Exitravel — Tableau de bord professionnel. Historique jamais perdu.
          </footer>
        </div>
      </div>
    </div>
  );
}