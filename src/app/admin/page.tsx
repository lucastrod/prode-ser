'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Calendar, 
  Award, 
  Gift, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Save, 
  Trash2,
  UserCheck,
  UserMinus,
  CheckCircle,
  AlertCircle,
  Database,
  ArrowDownToLine,
  Activity
} from 'lucide-react';

interface Metric {
  usersCount: number;
  predictionsCount: number;
  pendingMatches: number;
  finishedMatches: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
  createdAt: string;
  emailVerified?: boolean;
}

interface MatchData {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
}

interface PrizeData {
  id: number;
  position: number;
  title: string;
  description: string;
  enabled: boolean;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'matches' | 'results' | 'prizes'>('metrics');
  
  // States
  const [metrics, setMetrics] = useState<Metric>({ usersCount: 0, predictionsCount: 0, pendingMatches: 0, finishedMatches: 0 });
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [matchesList, setMatchesList] = useState<MatchData[]>([]);
  const [prizesList, setPrizesList] = useState<PrizeData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncToast, setSyncToast] = useState<{ matches: string[]; visible: boolean } | null>(null);

  // Filters for matches and results
  const [filterStage, setFilterStage] = useState<string>('Round of 32');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Forms
  const [userForm, setUserForm] = useState<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN'; password: string }>({ id: '', name: '', email: '', role: 'USER', password: '' });
  const [matchForm, setMatchForm] = useState<{ id: number; homeTeam: string; awayTeam: string; matchDate: string; groupName: string; status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED'; homeScore: string; awayScore: string; penaltyWinner?: string | null }>({ id: 0, homeTeam: '', awayTeam: '', matchDate: '', groupName: 'Grupo A', status: 'SCHEDULED', homeScore: '', awayScore: '', penaltyWinner: null });
  const [prizeForm, setPrizeForm] = useState({ id: 0, position: 1, title: '', description: '', enabled: true });
  
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'ADMIN') {
      router.push('/');
    }
  }, [profile, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch metrics
      const metRes = await fetch('/api/admin/metrics');
      if (metRes.ok) {
        const metData = await metRes.json();
        setMetrics(metData.metrics);
      }

      // 2. Fetch users
      const usrRes = await fetch('/api/admin/users');
      if (usrRes.ok) {
        const usrData = await usrRes.json();
        setUsersList(usrData.users || []);
      }

      // 3. Fetch matches
      const matRes = await fetch('/api/matches');
      if (matRes.ok) {
        const matData = await matRes.json();
        setMatchesList(matData.matches || []);
      }

      // 4. Fetch prizes
      const przRes = await fetch('/api/prizes');
      if (przRes.ok) {
        const przData = await przRes.json();
        setPrizesList(przData.prizes || []);
      }

    } catch (err) {
      console.error('Failed to load admin panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role === 'ADMIN') {
      loadData();
    }
  }, [profile]);

  // --- ACTIONS ---

  const handleImportFixtures = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      });
      const data = await res.json();
      alert(data.message || 'Fixture importado con éxito.');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al importar fixtures.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReimportGroups = async () => {
    const confirmed = window.confirm(
      '⚠️ Esto borrará todos los partidos de Fase de Grupos y los reimportará con los 6 partidos por grupo.\n\nLos pronósticos de Fase de Grupos existentes también se borrarán.\n\n¿Querés continuar?'
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/matches/reimport-groups', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}\n\nEliminados: ${data.deleted} partidos\nImportados: ${data.created} partidos`);
        await loadData();
      } else {
        alert('❌ Error: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al reimportar los partidos de grupo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateKnockout = async () => {
    const hasKnockouts = matchesList.some((m) => m.groupName === 'Fase Final' || m.groupName === 'Fase de Grupos' === false && m.groupName !== '');
    let url = '/api/admin/knockout/generate';
    
    if (hasKnockouts) {
      const confirmReset = window.confirm(
        '⚠️ Ya existen llaves de la Fase Eliminatoria en la base de datos.\n\n¿Querés recrearlas de cero usando los nuevos clasificatorios? (Esto sobrescribirá los cruces actuales por los nuevos corregidos).'
      );
      if (confirmReset) {
        url += '?reset=true';
      } else {
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const lines: string[] = [`✅ ${data.message}`];
        if (data.deduplicated > 0) lines.push(`\n🗑️ Duplicados eliminados: ${data.deduplicated}`);
        if ((data.resolved || []).length > 0) lines.push(`\n✔ Resueltos:\n${data.resolved.join('\n')}`);
        if ((data.skipped || []).length > 0) lines.push(`\n⏳ Pendientes (sin resultado de grupo):\n${data.skipped.join('\n')}`);
        alert(lines.join(''));
        await loadData();
      } else {
        alert('❌ Error: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al generar el bracket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveKnockout = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/knockout/resolve', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}\n\nResueltos:\n${(data.resolved || []).join('\n') || 'Ninguno nuevo'}\n\nPendientes:\n${(data.skipped || []).join('\n') || 'Ninguno'}`);
        await loadData();
      } else {
        alert('❌ Error: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al resolver cruces.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceSync = async () => {
    setActionLoading(true);
    setSyncMessage(null);
    // Reset any open editing state so sync doesn't leave form open
    setEditingId(null);
    setMatchForm({ id: 0, homeTeam: '', awayTeam: '', matchDate: '', groupName: 'Grupo A', status: 'SCHEDULED', homeScore: '', awayScore: '', penaltyWinner: null });
    try {
      const res = await fetch('/api/admin/matches/sync-preview');
      const data = await res.json();

      if (!res.ok) {
        setSyncMessage({ type: 'error', text: 'Error al conectar con ESPN.' });
        return;
      }

      if (!data.matches || data.matches.length === 0) {
        setSyncMessage({ type: 'error', text: 'No hay resultados nuevos en ESPN para los partidos pendientes.' });
        setTimeout(() => setSyncMessage(null), 5000);
        return;
      }

      // Guardar todos los partidos encontrados directamente en la BD sin intervención manual
      const savedMatches: string[] = [];
      for (const suggested of data.matches) {
        const original = matchesList.find((m) => m.id === suggested.id);
        if (!original) continue;
        try {
          const saveRes = await fetch('/api/admin/matches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: original.id,
              homeTeam: original.homeTeam,
              awayTeam: original.awayTeam,
              matchDate: original.matchDate,
              groupName: original.groupName,
              status: 'FINISHED',
              homeScore: suggested.homeScore,
              awayScore: suggested.awayScore,
            }),
          });
          if (saveRes.ok) {
            savedMatches.push(`${original.homeTeam} ${suggested.homeScore} - ${suggested.awayScore} ${original.awayTeam}`);
          } else {
            const errData = await saveRes.json();
            console.error(`Error guardando partido ${original.id}:`, errData.error);
          }
        } catch (saveErr) {
          console.error(`Error guardando partido ${original.id}:`, saveErr);
        }
      }

      // Reset form/editing state before reloading to prevent stale UI
      setEditingId(null);
      setMatchForm({ id: 0, homeTeam: '', awayTeam: '', matchDate: '', groupName: 'Grupo A', status: 'SCHEDULED', homeScore: '', awayScore: '', penaltyWinner: null });
      await loadData();

      if (savedMatches.length > 0) {
        setSyncToast({ matches: savedMatches, visible: true });
        setTimeout(() => setSyncToast(null), 8000);
        setSyncMessage({
          type: 'success',
          text: `✅ ${savedMatches.length} resultado${savedMatches.length !== 1 ? 's' : ''} sincronizado${savedMatches.length !== 1 ? 's' : ''}.`,
        });
      } else {
        setSyncMessage({ type: 'error', text: 'Se encontraron partidos en ESPN pero ninguno pudo guardarse.' });
      }
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setSyncMessage({ type: 'error', text: 'Error inesperado al sincronizar con ESPN.' });
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // --- USERS MANAGEMENT ---

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const isEdit = !!userForm.id;
      const url = '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      if (res.ok) {
        setUserForm({ id: '', name: '', email: '', role: 'USER', password: '' });
        setEditingId(null);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar usuario.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Seguro querés eliminar este usuario? Se borrarán todos sus pronósticos y estadísticas de forma permanente.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar usuario.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar usuario.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (u: UserData) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role, active: !u.active }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al cambiar estado del usuario.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // --- MATCHES MANAGEMENT ---

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const isEdit = matchForm.id !== 0;
      const url = '/api/admin/matches';
      const method = isEdit ? 'PUT' : 'POST';

      const parsedForm = {
        ...matchForm,
        homeScore: matchForm.homeScore === '' ? undefined : Number(matchForm.homeScore),
        awayScore: matchForm.awayScore === '' ? undefined : Number(matchForm.awayScore),
        penaltyWinner: matchForm.penaltyWinner,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedForm),
      });

      if (res.ok) {
        setMatchForm({ id: 0, homeTeam: '', awayTeam: '', matchDate: '', groupName: 'Grupo A', status: 'SCHEDULED', homeScore: '', awayScore: '', penaltyWinner: null });
        setEditingId(null);
        await loadData();
      } else {
        const errData = await res.json();
        alert(`Error al guardar el partido: ${errData.error || 'Desconocido'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // --- PRIZES MANAGEMENT ---

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prizeForm),
      });

      if (res.ok) {
        setPrizeForm({ id: 0, position: 1, title: '', description: '', enabled: true });
        setEditingId(null);
        await loadData();
      } else {
        alert('Error al guardar el premio.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePrizeEnabled = async (prize: PrizeData) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: prize.position,
          title: prize.title,
          description: prize.description,
          enabled: !prize.enabled,
        }),
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Error al toggle premio.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePrize = async (position: number) => {
    if (!confirm('¿Seguro querés eliminar este premio?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/prizes?position=${position}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Error al eliminar premio.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMatchesList = matchesList.filter((m) => {
    // 1. Status Filter
    if (filterStatus === 'PENDING' && m.status !== 'SCHEDULED') return false;
    if (filterStatus === 'LIVE' && m.status !== 'LIVE') return false;
    if (filterStatus === 'FINISHED' && m.status !== 'FINISHED') return false;

    // 2. Stage / Group Filter
    if (filterStage === 'ALL') return true;
    if (filterStage === 'GROUP_ALL') return m.groupName.startsWith('Grupo') || m.groupName.startsWith('Group');
    
    const stageMap: Record<string, string> = {
      'Round of 32': 'ROUND_32',
      'Round of 16': 'ROUND_16',
      'Cuartos de Final': 'QUARTER',
      'Semifinales': 'SEMI',
      '3er Puesto': 'THIRD_PLACE',
      'Gran Final': 'FINAL',
    };
    const mappedStage = stageMap[filterStage];
    if (mappedStage) {
      return (m as any).stage === mappedStage;
    }
    
    return m.groupName === filterStage || m.groupName === filterStage.replace('Grupo', 'Group') || m.groupName === filterStage.replace('Group', 'Grupo');
  });

  if (!profile || profile.role !== 'ADMIN') return null;

  return (
    <>
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-blue pl-3">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Gestión interna de PRODE SER: Usuarios, fixture, resultados y premios.
          </p>
        </div>

         {/* Global Action Buttons */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleImportFixtures}
              disabled={actionLoading}
              className="py-2.5 px-4 bg-sya-blue hover:bg-sya-blue/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Importar Fixture (Grupo)
            </button>
            <button
              onClick={handleReimportGroups}
              disabled={actionLoading}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Borra los partidos de grupo existentes y reimporta todos los 6 por grupo"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              Reimportar Grupos (6 por grupo)
            </button>
            <button
              onClick={handleForceSync}
              disabled={actionLoading}
              className="py-2.5 px-4 sya-button-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              Sincronizar Resultados
            </button>
          </div>
          {syncMessage && (
            <div
              className={`text-xs font-bold px-4 py-2 rounded-xl animate-slide-up ${
                syncMessage.type === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              {syncMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Knockout Bracket Panel ────────────────────────────────── */}
      <div className="sya-glass p-6 border border-indigo-500/20">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">Generación de Llaves Eliminatorias</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Ejecutá estos pasos en orden una vez que los grupos estén completos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
              <span className="font-extrabold text-sm text-indigo-400">Generar Bracket (Round of 32)</span>
            </div>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              Lee las posiciones de cada grupo desde la DB y crea los 32 partidos eliminatorios con los equipos clasificados. Ejecutar una sola vez después que terminen todos los grupos.
            </p>
            <button
              onClick={handleGenerateKnockout}
              disabled={actionLoading}
              className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {actionLoading ? 'Generando...' : 'Generar Bracket'}
            </button>
          </div>

          {/* Step 2 */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
              <span className="font-extrabold text-sm text-emerald-400">Resolver Cruces Siguientes</span>
            </div>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              A medida que avanzan las rondas, rellena automáticamente los equipos de Octavos, Cuartos, Semis y Final usando los ganadores/perdedores de la ronda anterior.
            </p>
            <button
              onClick={handleResolveKnockout}
              disabled={actionLoading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Resolviendo...' : 'Resolver Cruces'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 font-semibold mt-4 flex items-start gap-1.5">
          <span className="text-amber-400 font-black mt-px">ℹ</span>
          <span>
            El Paso 1 se usa una sola vez (el sábado a la noche). El Paso 2 se puede ejecutar periódicamente durante toda la fase eliminatoria para ir completando los cruces a medida que se juegan los partidos.
          </span>
        </p>
      </div>

      {/* Admin subtabs menu */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'metrics', name: 'Métricas', icon: Activity },
          { id: 'users', name: 'Usuarios', icon: Users },
          { id: 'matches', name: 'Fixture', icon: Calendar },
          { id: 'results', name: 'Validar Resultados', icon: Award },
          { id: 'prizes', name: 'Premios', icon: Gift },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'border-sya-orange text-sya-orange'
                  : 'border-transparent text-gray-500 hover:text-sya-orange'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {(activeTab === 'matches' || activeTab === 'results') && (
        <div className="flex flex-wrap gap-4 bg-gray-500/5 p-4 rounded-xl items-center animate-slide-up">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Grupo / Fase</span>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="block w-48 py-1.5 px-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Todos los grupos/fases</option>
              <option value="GROUP_ALL">Toda la Fase de Grupos</option>
              <option value="Grupo A">Grupo A</option>
              <option value="Grupo B">Grupo B</option>
              <option value="Grupo C">Grupo C</option>
              <option value="Grupo D">Grupo D</option>
              <option value="Grupo E">Grupo E</option>
              <option value="Grupo F">Grupo F</option>
              <option value="Grupo G">Grupo G</option>
              <option value="Grupo H">Grupo H</option>
              <option value="Grupo I">Grupo I</option>
              <option value="Grupo J">Grupo J</option>
              <option value="Grupo K">Grupo K</option>
              <option value="Grupo L">Grupo L</option>
              <option value="Round of 32">Round of 32</option>
              <option value="Round of 16">Octavos de Final</option>
              <option value="Cuartos de Final">Cuartos de Final</option>
              <option value="Semifinales">Semifinales</option>
              <option value="3er Puesto">3er Puesto</option>
              <option value="Gran Final">Gran Final</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-48 py-1.5 px-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="LIVE">En Juego</option>
              <option value="FINISHED">Finalizados</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando base de datos...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: METRICS */}
          {activeTab === 'metrics' && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
              <div className="sya-glass p-6 text-center border-t-8 border-sya-orange">
                <span className="text-xs uppercase font-extrabold text-gray-400 block mb-1">Usuarios Registrados</span>
                <span className="text-4xl font-extrabold text-sya-orange">{metrics.usersCount}</span>
              </div>
              <div className="sya-glass p-6 text-center border-t-8 border-sya-blue">
                <span className="text-xs uppercase font-extrabold text-gray-400 block mb-1">Pronósticos Cargados</span>
                <span className="text-4xl font-extrabold text-sya-blue">{metrics.predictionsCount}</span>
              </div>
              <div className="sya-glass p-6 text-center border-t-8 border-yellow-500">
                <span className="text-xs uppercase font-extrabold text-gray-400 block mb-1">Partidos Pendientes</span>
                <span className="text-4xl font-extrabold text-yellow-500">{metrics.pendingMatches}</span>
              </div>
              <div className="sya-glass p-6 text-center border-t-8 border-green-500">
                <span className="text-xs uppercase font-extrabold text-gray-400 block mb-1">Partidos Finalizados</span>
                <span className="text-4xl font-extrabold text-green-500">{metrics.finishedMatches}</span>
              </div>
            </section>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
              {/* Form Col */}
              <div className="sya-glass p-6 h-fit space-y-4">
                <h3 className="text-base font-extrabold font-serif border-b pb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-sya-orange" />
                  {userForm.id ? 'Editar Usuario' : 'Crear Usuario'}
                </h3>
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent text-sm font-semibold"
                      placeholder="Nombre del empleado"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Usuario</label>
                    <input
                      type="text"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent text-sm font-semibold"
                      placeholder="Ej. lucas"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Contraseña {userForm.id && '(Opcional para resetear)'}</label>
                    <input
                      type="password"
                      required={!userForm.id}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent text-sm font-semibold"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rol</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                      className="block w-full py-2.5 px-3.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent text-sm font-semibold"
                    >
                      <option value="USER">Empleado (User)</option>
                      <option value="ADMIN">Administrador (Admin)</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={actionLoading} className="flex-1 py-3 sya-button-primary text-xs">
                      Guardar
                    </button>
                    {userForm.id && (
                      <button 
                        type="button" 
                        onClick={() => setUserForm({ id: '', name: '', email: '', role: 'USER', password: '' })}
                        className="py-3 px-4 sya-button-secondary text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List Col */}
              <div className="sya-glass p-6 lg:col-span-2 overflow-hidden">
                <h3 className="text-base font-extrabold font-serif border-b pb-3 mb-4">
                  Lista de Usuarios
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-gray-400 border-b border-gray-200 dark:border-gray-800 uppercase pb-2">
                        <th className="pb-3">Nombre</th>
                        <th className="pb-3">Estado</th>
                        <th className="pb-3">Rol</th>
                        <th className="pb-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm font-semibold">
                      {usersList.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-500/5 ${!u.active ? 'opacity-50' : ''}`}>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-400 font-medium">{u.email}</div>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              u.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {u.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-sya-orange/10 text-sya-orange' : 'bg-gray-500/10 text-gray-500'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleToggleActive(u)}
                                disabled={actionLoading}
                                title={u.active ? 'Deshabilitar usuario' : 'Habilitar usuario'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.active
                                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500'
                                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-500'
                                }`}
                              >
                                {u.active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  setUserForm({ id: u.id, name: u.name, email: u.email.split('@')[0], role: u.role, password: '' });
                                  setEditingId(u.id);
                                }}
                                className="p-1.5 bg-sya-blue/10 hover:bg-sya-blue/20 text-sya-blue rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIXTURE */}
          {activeTab === 'matches' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
              {/* Form Col */}
              <div className="sya-glass p-6 h-fit space-y-4">
                <h3 className="text-base font-extrabold font-serif border-b pb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-sya-orange" />
                  {matchForm.id !== 0 ? 'Editar Partido' : 'Crear Partido'}
                </h3>
                <form onSubmit={handleSaveMatch} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Equipo Local</label>
                    <input
                      type="text"
                      required
                      value={matchForm.homeTeam}
                      onChange={(e) => setMatchForm({ ...matchForm, homeTeam: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                      placeholder="Ej. Argentina"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Equipo Visitante</label>
                    <input
                      type="text"
                      required
                      value={matchForm.awayTeam}
                      onChange={(e) => setMatchForm({ ...matchForm, awayTeam: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                      placeholder="Ej. México"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Fecha y Hora</label>
                    <input
                      type="datetime-local"
                      required
                      value={matchForm.matchDate}
                      onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Grupo</label>
                    <select
                      value={matchForm.groupName}
                      onChange={(e) => setMatchForm({ ...matchForm, groupName: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                    >
                      {[...Array(12)].map((_, i) => {
                        const letter = String.fromCharCode(65 + i); // A to L
                        return (
                          <option key={letter} value={`Grupo ${letter}`}>Grupo {letter}</option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={actionLoading} className="flex-1 py-3 sya-button-primary text-xs">
                      Guardar
                    </button>
                    {matchForm.id !== 0 && (
                      <button 
                        type="button" 
                        onClick={() => setMatchForm({ id: 0, homeTeam: '', awayTeam: '', matchDate: '', groupName: 'Grupo A', status: 'SCHEDULED', homeScore: '', awayScore: '', penaltyWinner: null })}
                        className="py-3 px-4 sya-button-secondary text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List Col */}
              <div className="sya-glass p-6 lg:col-span-2 overflow-hidden">
                <h3 className="text-base font-extrabold font-serif border-b pb-3 mb-4">
                  Lista de Partidos (Grupo Stage)
                </h3>
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-gray-400 border-b border-gray-200 dark:border-gray-800 uppercase pb-2">
                        <th className="pb-3">Partido</th>
                        <th className="pb-3">Grupo</th>
                        <th className="pb-3">Fecha</th>
                        <th className="pb-3 text-right">Editar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm font-semibold">
                      {filteredMatchesList.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-500/5">
                          <td className="py-3">
                            <span className="font-extrabold">{m.homeTeam} vs {m.awayTeam}</span>
                          </td>
                          <td className="py-3">{m.groupName}</td>
                          <td className="py-3 text-xs text-gray-400">
                            {new Date(m.matchDate).toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                // format date to match input value datetime-local (yyyy-MM-ddThh:mm)
                                const d = new Date(m.matchDate);
                                const dateVal = d.getFullYear() + '-' + 
                                  String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                                  String(d.getDate()).padStart(2, '0') + 'T' + 
                                  String(d.getHours()).padStart(2, '0') + ':' + 
                                  String(d.getMinutes()).padStart(2, '0');
                                
                                setMatchForm({
                                  id: m.id,
                                  homeTeam: m.homeTeam,
                                  awayTeam: m.awayTeam,
                                  matchDate: dateVal,
                                  groupName: m.groupName,
                                  status: m.status,
                                  homeScore: m.homeScore !== null ? String(m.homeScore) : '',
                                  awayScore: m.awayScore !== null ? String(m.awayScore) : '',
                                  penaltyWinner: (m as any).penaltyWinner || null,
                                });
                                setEditingId(m.id);
                              }}
                              className="p-1.5 bg-sya-blue/10 hover:bg-sya-blue/20 text-sya-blue rounded-lg"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESULTS */}
          {activeTab === 'results' && (
            <div className="sya-glass p-6 animate-slide-up">
              <h3 className="text-base font-extrabold font-serif border-b pb-3 mb-4">
                Validación y Cierre de Resultados Oficiales
              </h3>
              <p className="text-xs text-gray-400 font-semibold mb-6">
                Ingresá los marcadores de los partidos finalizados. Al guardar, el sistema calculará los puntos de los pronósticos de los usuarios automáticamente.
              </p>
              
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 border-b border-gray-200 dark:border-gray-800 uppercase pb-2">
                      <th className="pb-3">Partido</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3 text-center">Resultado Oficial</th>
                      <th className="pb-3 text-right">Guardar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm font-semibold">
                    {filteredMatchesList.map((m) => {
                      const isEditingThis = editingId === m.id;
                      return (
                        <tr id={`match_${m.id}`} key={m.id} className="hover:bg-gray-500/5">
                          <td className="py-4">
                            <div>{m.homeTeam} vs {m.awayTeam}</div>
                            <div className="text-xs text-gray-400 font-medium">{m.groupName} • {new Date(m.matchDate).toLocaleString('es-AR')}</div>
                          </td>
                          <td className="py-4">
                            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full ${
                              m.status === 'FINISHED' ? 'badge-finished' : m.status === 'LIVE' ? 'badge-live' : 'badge-pending'
                            }`}>
                              {m.status === 'FINISHED' ? 'Finalizado' : m.status === 'LIVE' ? 'En Juego' : 'Pendiente'}
                            </span>
                          </td>
                          
                          {/* Score Input/Display */}
                          <td className="py-4 text-center">
                            {isEditingThis ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={matchForm.homeScore}
                                    onChange={(e) => setMatchForm({ ...matchForm, homeScore: e.target.value })}
                                    className="w-10 h-8 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-extrabold focus:outline-none"
                                  />
                                  <span>-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={matchForm.awayScore}
                                    onChange={(e) => setMatchForm({ ...matchForm, awayScore: e.target.value })}
                                    className="w-10 h-8 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-extrabold focus:outline-none"
                                  />
                                </div>
                                {matchForm.homeScore !== '' && matchForm.homeScore === matchForm.awayScore && !m.groupName.includes('Grupo') && (
                                  <div className="mt-2 w-full">
                                    <select
                                      value={matchForm.penaltyWinner || ''}
                                      onChange={(e) => setMatchForm({ ...matchForm, penaltyWinner: e.target.value || null })}
                                      className="w-full text-[10px] py-1 px-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                                    >
                                      <option value="">Ganador en Penales...</option>
                                      <option value="home">{m.homeTeam}</option>
                                      <option value="away">{m.awayTeam}</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-extrabold text-sya-blue">
                                {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : '-'}
                              </span>
                            )}
                          </td>
                          
                          <td className="py-4 text-right">
                            {isEditingThis ? (
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={handleSaveMatch}
                                  disabled={actionLoading}
                                  className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                  }}
                                  className="p-1.5 bg-gray-500/25 text-gray-500 rounded-lg hover:bg-gray-500/35 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setMatchForm({
                                    id: m.id,
                                    homeTeam: m.homeTeam,
                                    awayTeam: m.awayTeam,
                                    matchDate: m.matchDate,
                                    groupName: m.groupName,
                                    status: 'FINISHED',
                                    homeScore: m.homeScore !== null ? String(m.homeScore) : '0',
                                    awayScore: m.awayScore !== null ? String(m.awayScore) : '0',
                                    penaltyWinner: (m as any).penaltyWinner || null,
                                  });
                                  setEditingId(m.id);
                                }}
                                className="px-3 py-1.5 bg-sya-orange/10 hover:bg-sya-orange/20 text-sya-orange font-bold text-xs rounded-xl"
                              >
                                Cargar Resultado
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredMatchesList.map((m) => {
                  const isEditingThis = editingId === m.id;
                  return (
                    <div id={`match_mob_${m.id}`} key={`mob_${m.id}`} className="bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm">{m.homeTeam} vs {m.awayTeam}</div>
                          <div className="text-xs text-gray-400">{m.groupName} • {new Date(m.matchDate).toLocaleDateString('es-AR')}</div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-full ${
                          m.status === 'FINISHED' ? 'badge-finished' : m.status === 'LIVE' ? 'badge-live' : 'badge-pending'
                        }`}>
                          {m.status === 'FINISHED' ? 'Finalizado' : m.status === 'LIVE' ? 'En Juego' : 'Pendiente'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
                        {isEditingThis ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 justify-center">
                              <input
                                type="number"
                                min="0"
                                value={matchForm.homeScore}
                                onChange={(e) => setMatchForm({ ...matchForm, homeScore: e.target.value })}
                                className="w-12 h-10 text-center bg-gray-500/10 border border-gray-300 dark:border-gray-700 rounded-lg text-base font-black focus:outline-none"
                              />
                              <span className="font-bold text-gray-400">-</span>
                              <input
                                type="number"
                                min="0"
                                value={matchForm.awayScore}
                                onChange={(e) => setMatchForm({ ...matchForm, awayScore: e.target.value })}
                                className="w-12 h-10 text-center bg-gray-500/10 border border-gray-300 dark:border-gray-700 rounded-lg text-base font-black focus:outline-none"
                              />
                            </div>
                            {matchForm.homeScore !== '' && matchForm.homeScore === matchForm.awayScore && !m.groupName.includes('Grupo') && (
                              <div className="w-full">
                                <select
                                  value={matchForm.penaltyWinner || ''}
                                  onChange={(e) => setMatchForm({ ...matchForm, penaltyWinner: e.target.value || null })}
                                  className="w-full text-xs py-1.5 px-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                                >
                                  <option value="">Ganador en Penales...</option>
                                  <option value="home">{m.homeTeam}</option>
                                  <option value="away">{m.awayTeam}</option>
                                </select>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-black text-xl text-sya-blue">
                            {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : '-'}
                          </div>
                        )}

                        <div>
                          {isEditingThis ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-2 bg-gray-500/20 text-gray-400 font-bold text-xs rounded-xl"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveMatch}
                                disabled={actionLoading}
                                className="px-3 py-2 bg-green-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" /> Guardar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setMatchForm({
                                  id: m.id,
                                  homeTeam: m.homeTeam,
                                  awayTeam: m.awayTeam,
                                  matchDate: m.matchDate,
                                  groupName: m.groupName,
                                  status: 'FINISHED',
                                  homeScore: m.homeScore !== null ? String(m.homeScore) : '0',
                                  awayScore: m.awayScore !== null ? String(m.awayScore) : '0',
                                  penaltyWinner: (m as any).penaltyWinner || null,
                                });
                                setEditingId(m.id);
                              }}
                              className="px-4 py-2 bg-sya-orange/10 text-sya-orange font-bold text-xs rounded-xl"
                            >
                              Cargar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: PRIZES */}
          {activeTab === 'prizes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
              {/* Form Col */}
              <div className="sya-glass p-6 h-fit space-y-4">
                <h3 className="text-base font-extrabold font-serif border-b pb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-sya-orange" />
                  {prizeForm.id !== 0 ? 'Editar Premio' : 'Crear Premio'}
                </h3>
                <form onSubmit={handleSavePrize} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Posición de Tabla</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={prizeForm.position}
                      onChange={(e) => setPrizeForm({ ...prizeForm, position: parseInt(e.target.value) || 1 })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Título del Premio</label>
                    <input
                      type="text"
                      required
                      value={prizeForm.title}
                      onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
                      placeholder="Ej. 🥇 Primer Puesto"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Descripción</label>
                    <textarea
                      required
                      rows={3}
                      value={prizeForm.description}
                      onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                      className="block w-full py-2.5 px-3.5 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none text-sm"
                      placeholder="Cena para dos personas..."
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={actionLoading} className="flex-1 py-3 sya-button-primary text-xs">
                      Guardar
                    </button>
                    {prizeForm.id !== 0 && (
                      <button 
                        type="button" 
                        onClick={() => setPrizeForm({ id: 0, position: 1, title: '', description: '', enabled: true })}
                        className="py-3 px-4 sya-button-secondary text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List Col */}
              <div className="sya-glass p-6 lg:col-span-2 overflow-hidden">
                <h3 className="text-base font-extrabold font-serif border-b pb-3 mb-4">
                  Lista de Premios
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-gray-400 border-b border-gray-200 dark:border-gray-800 uppercase pb-2">
                        <th className="pb-3 w-16">Posición</th>
                        <th className="pb-3">Premio</th>
                        <th className="pb-3 text-center">Habilitado</th>
                        <th className="pb-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm font-semibold">
                      {prizesList.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-500/5">
                          <td className="py-3 text-center text-lg">{p.position}</td>
                          <td className="py-3">
                            <div className="font-extrabold">{p.title}</div>
                            <div className="text-xs text-gray-400 font-medium">{p.description}</div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {p.enabled ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setPrizeForm({ id: p.id, position: p.position, title: p.title, description: p.description, enabled: p.enabled });
                                  setEditingId(p.position);
                                }}
                                className="p-1.5 bg-sya-blue/10 hover:bg-sya-blue/20 text-sya-blue rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTogglePrizeEnabled(p)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  p.enabled 
                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500' 
                                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-500'
                                }`}
                              >
                                {p.enabled ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeletePrize(p.position)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                              >
                                <Plus className="w-4 h-4 rotate-45" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>

      {/* Sync Toast Notification */}
      {syncToast?.visible && (
        <div
          className="fixed bottom-6 right-6 z-50 animate-slide-up"
          style={{ maxWidth: '360px' }}
        >
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white">Resultados sincronizados</p>
                  <p className="text-xs text-gray-400 font-medium">ESPN · Automático</p>
                </div>
              </div>
              <button
                onClick={() => setSyncToast(null)}
                className="text-gray-500 hover:text-white text-lg leading-none shrink-0"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <ul className="space-y-1.5 border-t border-gray-700 pt-3">
              {syncToast.matches.map((m, i) => (
                <li key={i} className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
