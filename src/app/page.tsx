'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, 
  Calendar, 
  Gift, 
  User, 
  ChevronRight, 
  Clock, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Edit2
} from 'lucide-react';

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
}

interface Prediction {
  matchId: number;
  predictedHomeScore: number | '';
  predictedAwayScore: number | '';
}


export default function HomePage() {
  const { user, profile } = useAuth();
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        // Fetch matches
        const matchesRes = await fetch('/api/matches');
        const predictionsRes = await fetch(`/api/predictions?userId=${user.id}`);
        
        if (matchesRes.ok && predictionsRes.ok) {
          const matchesData = await matchesRes.json();
          const predictionsData = await predictionsRes.json();

          // Get next 10 upcoming matches (status SCHEDULED, sorted by date asc)
          const now = new Date();
          const upcoming = (matchesData.matches || [])
            .filter((m: Match) => m.status === 'SCHEDULED' && new Date(m.matchDate).getTime() - 15 * 60000 > now.getTime())
            .slice(0, 10);

          setUpcomingMatches(upcoming);

          // Populate existing predictions in state
          const predsMap: Record<number, Prediction> = {};
          const savedIds = new Set<number>();
          (predictionsData.predictions || []).forEach((p: any) => {
            predsMap[p.matchId] = {
              matchId: p.matchId,
              predictedHomeScore: p.predictedHomeScore,
              predictedAwayScore: p.predictedAwayScore,
            };
            savedIds.add(p.matchId);
          });
          setPredictions(predsMap);
          setSavedMatchIds(savedIds);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control/navigation keys: backspace, delete, tab, escape, enter, arrows
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ].includes(e.key)) {
      return;
    }
    // Allow clipboard/select shortcuts
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    // Prevent keypress if not a digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleScoreChange = (matchId: number, team: 'home' | 'away', val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    const scoreVal = cleanVal === '' ? '' : parseInt(cleanVal, 10);
    
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { matchId, predictedHomeScore: '', predictedAwayScore: '' },
        [team === 'home' ? 'predictedHomeScore' : 'predictedAwayScore']: scoreVal,
      },
    }));

    // Reset save state on change
    setSaveStates((prev) => ({ ...prev, [matchId]: 'idle' }));
  };

  const handleSavePrediction = async (matchId: number) => {
    if (!user) return;
    
    const pred = predictions[matchId] || { predictedHomeScore: 0, predictedAwayScore: 0 };

    setSaveStates((prev) => ({ ...prev, [matchId]: 'saving' }));

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          matchId,
          predictedHomeScore: pred.predictedHomeScore === '' ? 0 : Number(pred.predictedHomeScore),
          predictedAwayScore: pred.predictedAwayScore === '' ? 0 : Number(pred.predictedAwayScore),
        }),
      });


      if (res.ok) {
        setSaveStates((prev) => ({ ...prev, [matchId]: 'saved' }));
        setSavedMatchIds((prev) => {
          const next = new Set(prev);
          next.add(matchId);
          return next;
        });
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [matchId]: 'idle' }));
        }, 3000);
      } else {
        setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
      }
    } catch (err) {
      console.error('Error saving prediction:', err);
      setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
    }
  };

  const formatMatchDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' hs';
  };

  const quickActions = [
    { 
      name: 'Próximos Partidos', 
      desc: 'Cargá y editá tus pronósticos', 
      href: '/groups', 
      icon: Calendar,
      color: 'bg-sya-orange',
    },
    { 
      name: 'Mis Pronósticos', 
      desc: 'Revisá tus puntos y resultados', 
      href: '/predictions', 
      icon: User,
      color: 'bg-sya-blue',
    },
    { 
      name: 'Tabla de Posiciones', 
      desc: 'Mirá el ranking del torneo', 
      href: '/standings', 
      icon: Trophy,
      color: 'bg-emerald-500',
    },
    { 
      name: 'Premios del Prode', 
      desc: 'Conocé los premios para los ganadores', 
      href: '/prizes', 
      icon: Gift,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* Welcome Banner */}
      <section className="sya-glass p-8 sya-card-accent relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#1B199A]">Torneo PRODE SER</span>
          <h1 className="text-3xl font-extrabold font-serif tracking-tight">
            Mundial de Pronósticos PRODE SER
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl font-medium">
            ¡Demostrá tus conocimientos de fútbol y sumá puntos! ¿Te animás a liderar la tabla del grupo de jóvenes?
          </p>
        </div>
        <div className="flex gap-4 shrink-0 z-10">
          <Link href="/groups" className="px-6 py-3 sya-button-primary text-sm shadow-md">
            Cargar Pronósticos
          </Link>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange pl-3">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link 
                key={action.name} 
                href={action.href}
                className="sya-glass p-6 group hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg group-hover:text-sya-orange transition-colors">
                  {action.name}
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-1 mb-4">
                  {action.desc}
                </p>
                <div className="flex items-center text-xs font-bold text-sya-blue group-hover:text-sya-orange transition-colors">
                  <span>Ir ahora</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Home Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Upcoming matches prediction helper */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange pl-3">
            Próximos Partidos a Jugar
          </h2>

          {loading ? (
            <div className="sya-glass p-12 text-center text-gray-400 font-semibold animate-pulse">
              Cargando fixture...
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="sya-glass p-8 text-center text-gray-400 font-semibold border-dashed border-2">
              No hay partidos próximos programados. ¡Revisá la sección de Fase de Grupos!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingMatches.map((match) => {
                const pred = predictions[match.id] || { predictedHomeScore: 0, predictedAwayScore: 0 };
                const saveState = saveStates[match.id] || 'idle';
                
                return (
                  <div key={match.id} className="sya-glass p-5 hover:border-sya-orange/30 transition-all">
                    
                    {/* Header: Date and Group */}
                    <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sya-orange" />
                        <span>{formatMatchDate(match.matchDate)}</span>
                      </div>
                      <span className="bg-sya-blue/10 text-sya-blue px-2.5 py-1 rounded-full uppercase">
                        {match.groupName}
                      </span>
                    </div>

                    {/* Score Input Fields Grid */}
                    <div className="flex items-center justify-between gap-4">
                      
                      {/* Home Team */}
                      <div className="flex-1 text-right font-bold text-sm sm:text-base pr-2 truncate">
                        {match.homeTeam}
                      </div>

                      {/* Inputs Row */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pred.predictedHomeScore}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          onKeyDown={handleNumericKeyDown}
                          className="w-14 h-14 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent font-black text-2xl no-spinner"
                        />
                        <span className="text-gray-400 font-extrabold text-xs">vs</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pred.predictedAwayScore}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          onKeyDown={handleNumericKeyDown}
                          className="w-14 h-14 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent font-black text-2xl no-spinner"
                        />
                      </div>


                      {/* Away Team */}
                      <div className="flex-1 text-left font-bold text-sm sm:text-base pl-2 truncate">
                        {match.awayTeam}
                      </div>

                      {/* Action Button */}
                      <div className="w-28 flex justify-end shrink-0">
                        <button
                          onClick={() => handleSavePrediction(match.id)}
                          disabled={saveState === 'saving'}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            saveState === 'saved'
                              ? 'bg-green-500 text-white'
                              : saveState === 'error'
                              ? 'bg-red-500 text-white'
                              : savedMatchIds.has(match.id)
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-sya-orange hover:bg-sya-orange-hover text-white'
                          }`}
                        >
                          {saveState === 'saving' ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : saveState === 'saved' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Guardado</span>
                            </>
                          ) : saveState === 'error' ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Error</span>
                            </>
                          ) : (
                            <>
                              {savedMatchIds.has(match.id) ? <Edit2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                              <span>{savedMatchIds.has(match.id) ? 'Editar' : 'Predecir'}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
              </div>
              <div className="text-right mt-4">
                <Link href="/groups" className="text-xs font-bold text-sya-blue hover:text-sya-orange hover:underline transition-colors inline-flex items-center gap-1">
                  <span>Ver todas las predicciones</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Right 1 Col: Rule cards & info */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-[#1B199A] pl-3">
            Reglas del PRODE
          </h2>
          <div className="sya-glass p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-[#1B199A] uppercase tracking-wider">Cómputo de Puntos</h3>
              <ul className="text-xs space-y-2 font-semibold">
                <li className="flex items-start gap-2 text-green-500">
                  <span className="font-bold w-10 shrink-0">6 pts</span>
                  <span>Resultado Exacto (ej. predecís 2-1 y sale 2-1).</span>
                </li>
                <li className="flex items-start gap-2 text-blue-500">
                  <span className="font-bold w-10 shrink-0">4 pts</span>
                  <span>Acertar Ganador y Diferencia de goles exacta sin marcador exacto (ej. predecís 1-0 y sale 2-1).</span>
                </li>
                <li className="flex items-start gap-2 text-amber-500">
                  <span className="font-bold w-10 shrink-0">3 pts</span>
                  <span>Acertar Ganador o Empate sin diferencia de goles exacta (ej. predecís 3-0 y sale 2-1, o empates como 1-1 vs 2-2).</span>
                </li>
                <li className="flex items-start gap-2 text-red-500">
                  <span className="font-bold w-10 shrink-0">0 pts</span>
                  <span>Predicción incorrecta de ganador/empate.</span>
                </li>
              </ul>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800"></div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-sya-orange uppercase tracking-wider">Tiempos de Carga</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Podés cargar o modificar tus predicciones en cualquier momento. Por seguridad, se bloquearán automáticamente 15 minutos antes del inicio del partido.
              </p>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
