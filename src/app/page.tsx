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
  Edit2,
  Swords,
  Star,
  Lock,
} from 'lucide-react';
const FLAG_MAP: Record<string, string> = {
  "Alemania": "🇩🇪",
  "Argelia": "🇩🇿",
  "Argentina": "🇦🇷",
  "Arabia Saudita": "🇸🇦",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Bélgica": "🇧🇪",
  "Bosnia y Herzegovina": "🇧🇦",
  "Brasil": "🇧🇷",
  "Canadá": "🇨🇦",
  "Cabo Verde": "🇨🇻",
  "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷",
  "Costa de Marfil": "🇨🇮",
  "Croacia": "🇭🇷",
  "Curazao": "🇨🇼",
  "Ecuador": "🇪🇨",
  "Egipto": "🇪🇬",
  "España": "🇪🇸",
  "Estados Unidos": "🇺🇸",
  "Francia": "🇫🇷",
  "Ghana": "🇬🇭",
  "Haití": "🇭🇹",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Irak": "🇮🇶",
  "Irán": "🇮🇷",
  "Japón": "🇯🇵",
  "Jordania": "🇯🇴",
  "Marruecos": "🇲🇦",
  "México": "🇲🇽",
  "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿",
  "Países Bajos": "🇳🇱",
  "Panamá": "🇵🇦",
  "Paraguay": "🇵🇾",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "República Checa": "🇨🇿",
  "República Democrática del Congo": "🇨🇩",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Senegal": "🇸🇳",
  "Sudáfrica": "🇿🇦",
  "Suecia": "🇸🇪",
  "Suiza": "🇨🇭",
  "Túnez": "🇹🇳",
  "Turquía": "🇹🇷",
  "Uruguay": "🇺🇾",
  "Uzbekistán": "🇺🇿",
};

export function getFlagEmoji(teamName: string): string {
  if (!teamName) return "";
  const cleanName = teamName.replace(/^\[|\]$/g, '').trim();
  if (FLAG_MAP[cleanName]) return FLAG_MAP[cleanName];
  
  // Try case insensitive or substring
  for (const [key, val] of Object.entries(FLAG_MAP)) {
    if (cleanName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanName.toLowerCase())) {
      return val;
    }
  }
  return "";
}


interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  stage?: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
}

interface Prediction {
  matchId: number;
  predictedHomeScore: number | '';
  predictedAwayScore: number | '';
}

const STAGE_LABELS: Record<string, string> = {
  ROUND_32: 'Round of 32',
  ROUND_16: 'Octavos de Final',
  QUARTER: 'Cuartos de Final',
  SEMI: 'Semifinales',
  THIRD_PLACE: '3er Puesto',
  FINAL: 'Gran Final',
};

export default function HomePage() {
  const { user, profile } = useAuth();
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [hasKnockoutMatches, setHasKnockoutMatches] = useState(false);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        const matchesRes = await fetch('/api/matches');
        const predictionsRes = await fetch(`/api/predictions?userId=${user.id}`);
        
        if (matchesRes.ok && predictionsRes.ok) {
          const matchesData = await matchesRes.json();
          const predictionsData = await predictionsRes.json();

          const now = new Date();
          const allMatches: Match[] = matchesData.matches || [];

          // Prefer knockout matches for upcoming
          const knockoutUpcoming = allMatches
            .filter((m) =>
              m.stage === 'ROUND_OF_32' &&
              m.status === 'SCHEDULED' &&
              new Date(m.matchDate).getTime() - 15 * 60000 > now.getTime()
            )
            .slice(0, 32);

          const anyKnockout = allMatches.some((m) => m.stage === 'ROUND_OF_32');
          setHasKnockoutMatches(anyKnockout);

          // If no knockout matches yet, fall back to group stage upcoming (read-only, no save)
          const groupUpcoming = allMatches
            .filter((m) =>
              (!m.stage || m.stage === 'GROUP') &&
              m.status === 'SCHEDULED' &&
              new Date(m.matchDate).getTime() - 15 * 60000 > now.getTime()
            )
            .slice(0, 6);

          setUpcomingMatches(knockoutUpcoming.length > 0 ? knockoutUpcoming : groupUpcoming);

          // Populate existing predictions
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
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ].includes(e.key)) {
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
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

  const getStageLabel = (match: Match) => {
    if (match.stage && match.stage !== 'GROUP' && STAGE_LABELS[match.stage]) {
      return STAGE_LABELS[match.stage];
    }
    return match.groupName || '';
  };

  // Are the upcoming matches knockout ones (predicting enabled) or group (read-only)?
  const upcomingAreKnockout = upcomingMatches.length > 0 && upcomingMatches.some((m) => m.stage && m.stage !== 'GROUP');

  const quickActions = [
    { 
      name: 'Eliminatorias', 
      desc: 'Cargá tus pronósticos de la fase final', 
      href: '/knockout', 
      icon: Swords,
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
      name: 'Premios', 
      desc: 'Conocé los premios para los ganadores', 
      href: '/prizes', 
      icon: Gift,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* Welcome Banner */}
      <section className="sya-glass p-5 sm:p-8 sya-card-accent relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1 sm:space-y-2 z-10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#1B199A]">Torneo PRODE SER</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight">
            Mundial de Pronósticos PRODE SER
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl font-medium">
            ¡Demostrá tus conocimientos de fútbol y sumá puntos! ¿Te animás a liderar la tabla de posiciones?
          </p>
        </div>
        <div className="flex gap-4 shrink-0 z-10">
          <Link href="/knockout" className="px-5 py-2.5 sm:px-6 sm:py-3 sya-button-primary text-sm shadow-md">
            Cargar Pronósticos
          </Link>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange dark:border-indigo-400 pl-3">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link 
                key={action.name} 
                href={action.href}
                className="sya-glass p-4 sm:p-6 group hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${action.color} flex items-center justify-center text-white mb-3 sm:mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-lg group-hover:text-sya-orange transition-colors leading-tight">
                  {action.name}
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-1 mb-3 sm:mb-4 hidden sm:block">
                  {action.desc}
                </p>
                <div className="flex items-center text-xs font-bold text-sya-blue dark:text-indigo-400 group-hover:text-sya-orange dark:group-hover:text-white transition-colors mt-2">
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
        
        {/* Left 2 Cols: Upcoming matches */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange dark:border-indigo-400 pl-3">
              Próximos Partidos a Jugar
            </h2>
            {upcomingAreKnockout && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-sya-orange/10 dark:bg-white/10 text-sya-orange dark:text-white px-3 py-1.5 rounded-full border border-sya-orange/20 dark:border-white/20">
                <Swords className="w-3 h-3" />
                Fase Eliminatoria
              </span>
            )}
          </div>

          {loading ? (
            <div className="sya-glass p-12 text-center text-gray-400 font-semibold animate-pulse">
              Cargando fixture...
            </div>
          ) : !hasKnockoutMatches ? (
            /* No knockout matches yet → "Próximamente" card */
            <div className="sya-glass p-10 text-center space-y-5 border border-dashed border-sya-orange/20">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-sya-orange/10 border-2 border-sya-orange/20 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-sya-orange/60" />
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <Star className="w-3.5 h-3.5 text-sya-orange/30" />
                <Star className="w-4 h-4 text-sya-orange/60" />
                <Star className="w-3.5 h-3.5 text-sya-orange/30" />
              </div>
              <div>
                <p className="font-extrabold text-lg">Próximamente</p>
                <p className="text-sm text-sya-orange font-bold mt-1">Fase Eliminatoria</p>
              </div>
              <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
                Los partidos de la Fase Eliminatoria se anunciarán el sábado a la noche, una vez que todos los grupos queden definidos. ¡Prepará tus pronósticos!
              </p>
              <Link
                href="/groups"
                className="inline-flex items-center gap-2 text-xs font-bold text-sya-blue hover:text-sya-orange transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                Ver resultados de Fase de Grupos
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="sya-glass p-8 text-center text-gray-400 font-semibold border-dashed border-2">
              No hay partidos eliminatorios próximos programados.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingMatches.map((match) => {
                  const pred = predictions[match.id] || { predictedHomeScore: '', predictedAwayScore: '' };
                  const saveState = saveStates[match.id] || 'idle';
                  const isKnockout = match.stage && match.stage !== 'GROUP';
                  
                  return (
                    <div key={match.id} className="sya-glass p-5 hover:border-sya-orange/30 transition-all">
                      
                      {/* Header: Date and Stage/Group */}
                      <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sya-orange dark:text-gray-300" />
                          <span>{formatMatchDate(match.matchDate)}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full uppercase text-[10px] font-bold ${
                          isKnockout
                            ? 'bg-sya-orange/10 dark:bg-white/10 text-sya-orange dark:text-white border border-sya-orange/20 dark:border-white/20'
                            : 'bg-sya-blue/10 text-sya-blue dark:bg-white/10 dark:text-white dark:border dark:border-white/20'
                        }`}>
                          {getStageLabel(match)}
                        </span>
                      </div>

                      {/* Score Input Fields Grid */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        
                        {/* Teams & Inputs Row */}
                        <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
                          {/* Home Team */}
                          <div className="flex-1 text-right font-bold text-sm sm:text-base pr-1 sm:pr-2 min-w-0 flex items-center justify-end gap-1.5">
                            <span className="text-base sm:text-lg shrink-0" title={match.homeTeam}>{getFlagEmoji(match.homeTeam)}</span>
                            <span className="truncate" title={match.homeTeam}>{match.homeTeam}</span>
                          </div>

                          {/* Inputs Row — only for knockout matches */}
                          {isKnockout ? (
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={pred.predictedHomeScore}
                                onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                onKeyDown={handleNumericKeyDown}
                                className="w-11 h-11 sm:w-14 sm:h-14 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent font-black text-xl sm:text-2xl no-spinner"
                              />
                              <span className="text-gray-400 font-extrabold text-[10px] sm:text-xs">vs</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={pred.predictedAwayScore}
                                onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                onKeyDown={handleNumericKeyDown}
                                className="w-11 h-11 sm:w-14 sm:h-14 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent font-black text-xl sm:text-2xl no-spinner"
                              />
                            </div>
                          ) : (
                            /* Group stage: read-only display */
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <div className="w-11 h-11 sm:w-14 sm:h-14 text-center bg-gray-100 dark:bg-gray-800/50 rounded-xl font-black text-xl sm:text-2xl flex items-center justify-center text-gray-300 dark:text-gray-600">
                                -
                              </div>
                              <span className="text-gray-400 font-extrabold text-[10px] sm:text-xs">vs</span>
                              <div className="w-11 h-11 sm:w-14 sm:h-14 text-center bg-gray-100 dark:bg-gray-800/50 rounded-xl font-black text-xl sm:text-2xl flex items-center justify-center text-gray-300 dark:text-gray-600">
                                -
                              </div>
                            </div>
                          )}

                          {/* Away Team */}
                          <div className="flex-1 text-left font-bold text-sm sm:text-base pl-1 sm:pl-2 min-w-0 flex items-center justify-start gap-1.5">
                            <span className="text-base sm:text-lg shrink-0" title={match.awayTeam}>{getFlagEmoji(match.awayTeam)}</span>
                            <span className="truncate" title={match.awayTeam}>{match.awayTeam}</span>
                          </div>
                        </div>

                        {/* Action Button — only for knockout */}
                        <div className="w-full sm:w-28 flex justify-center sm:justify-end shrink-0 mt-1 sm:mt-0">
                          {isKnockout ? (
                            <button
                              onClick={() => handleSavePrediction(match.id)}
                              disabled={saveState === 'saving'}
                              className={`w-full sm:w-auto py-2 px-4 sm:py-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
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
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold text-center leading-tight w-full sm:w-auto">
                              Solo vista
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-right mt-4">
                <Link href="/knockout" className="text-xs font-bold text-sya-blue hover:text-sya-orange hover:underline transition-colors inline-flex items-center gap-1">
                  <span>Ver todos los partidos eliminatorios</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Right 1 Col: Rule cards & info */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-[#1B199A] dark:border-indigo-400 pl-3">
            Reglas del PRODE
          </h2>
          <div className="sya-glass p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-[#1B199A] dark:text-indigo-400 uppercase tracking-wider">Cómputo de Puntos</h3>
              <ul className="text-xs space-y-2 font-semibold">
                <li className="flex items-start gap-2 text-green-500">
                  <span className="font-bold w-10 shrink-0">6 pts</span>
                  <span>Resultado Exacto (ej. predecís 2-1 y sale 2-1).</span>
                </li>
                <li className="flex items-start gap-2 text-amber-500">
                  <span className="font-bold w-10 shrink-0">3 pts</span>
                  <span>Acertar Ganador o Empate (ej. predecís 3-0 y sale 2-1, o empates como 1-1 vs 2-2).</span>
                </li>
                <li className="flex items-start gap-2 text-red-500">
                  <span className="font-bold w-10 shrink-0">0 pts</span>
                  <span>Predicción incorrecta de ganador/empate.</span>
                </li>
              </ul>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800"></div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-sya-orange dark:text-indigo-400 uppercase tracking-wider">Tiempos de Carga</h3>
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
