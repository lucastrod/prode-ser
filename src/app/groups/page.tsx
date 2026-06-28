'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, Lock, Save, CheckCircle, AlertCircle, Edit2, TrendingUp, Eye } from 'lucide-react';
import OtherPredictionsModal from '@/components/OtherPredictionsModal';
import { getFlagEmoji } from '@/app/page';

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

interface TeamStat {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
}

const GROUPS = [
  'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
  'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
];

function computeStandings(matches: Match[]): TeamStat[] {
  const statsMap: Record<string, TeamStat> = {};

  const ensure = (team: string) => {
    if (!statsMap[team]) {
      statsMap[team] = { team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    }
  };

  for (const m of matches) {
    // Count any match with official scores (FINISHED or LIVE with scores)
    if (m.homeScore === null || m.awayScore === null) continue;

    ensure(m.homeTeam);
    ensure(m.awayTeam);

    const home = statsMap[m.homeTeam];
    const away = statsMap[m.awayTeam];

    home.pj++;
    away.pj++;
    home.gf += m.homeScore;
    home.gc += m.awayScore;
    away.gf += m.awayScore;
    away.gc += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.g++; home.pts += 3;
      away.p++;
    } else if (m.homeScore < m.awayScore) {
      away.g++; away.pts += 3;
      home.p++;
    } else {
      home.e++; home.pts++;
      away.e++; away.pts++;
    }
  }

  return Object.values(statsMap).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const dgA = a.gf - a.gc;
    const dgB = b.gf - b.gc;
    if (dgB !== dgA) return dgB - dgA;
    return b.gf - a.gf;
  });
}

function GroupStandingsTable({ matches, groupName }: { matches: Match[]; groupName: string }) {
  const stats = computeStandings(matches);
  // Show table when at least one match has official scores or is finished
  const withScores = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);
  const finished = matches.filter((m) => m.status === 'FINISHED').length;
  const live = matches.filter((m) => m.status === 'LIVE' && m.homeScore !== null).length;

  // Show table if there are finished matches OR matches with scores
  if (withScores.length === 0 && finished === 0) return null;

  return (
    <div className="sya-glass overflow-hidden mt-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-sya-orange" />
        <span className="font-extrabold text-sm uppercase tracking-wider">Tabla del {groupName}</span>
        <span className="ml-auto text-[10px] text-gray-400 font-semibold">
          {finished}/{matches.length} partidos jugados
          {live > 0 && <span className="ml-2 text-amber-400">· {live} en juego</span>}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-500/5">
              <th className="text-left px-4 py-2.5 font-extrabold uppercase tracking-wider text-gray-400 w-6">#</th>
              <th className="text-left px-2 py-2.5 font-extrabold uppercase tracking-wider text-gray-400">Equipo</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-gray-400">PJ</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-green-500">G</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-amber-400">E</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-red-400">P</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-gray-400">GF</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-gray-400">GC</th>
              <th className="text-center px-2 py-2.5 font-extrabold uppercase tracking-wider text-gray-400">DG</th>
              <th className="text-center px-3 py-2.5 font-extrabold uppercase tracking-wider text-sya-orange">PTS</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => {
              const dg = s.gf - s.gc;
              const qualifies = i < 2;
              const possible3rd = i === 2;

              const posColors = ['bg-green-500', 'bg-green-500', 'bg-amber-400', 'bg-gray-400'];
              const posBg = posColors[Math.min(i, 3)];

              return (
                <tr
                  key={s.team}
                  className={`border-b border-gray-100 dark:border-gray-800/60 last:border-0 transition-colors hover:bg-gray-500/5 ${
                    qualifies ? 'border-l-2 border-l-green-500' : possible3rd ? 'border-l-2 border-l-amber-400' : ''
                  }`}
                >
                  {/* Position */}
                  <td className="pl-4 py-3">
                    <span className={`w-5 h-5 rounded-full ${posBg} text-white flex items-center justify-center font-black text-[10px]`}>
                      {i + 1}
                    </span>
                  </td>
                  {/* Team */}
                  <td className="px-2 py-3 font-bold text-sm">{s.team}</td>
                  {/* PJ */}
                  <td className="px-2 py-3 text-center text-gray-400 font-semibold">{s.pj}</td>
                  {/* G */}
                  <td className="px-2 py-3 text-center font-extrabold text-green-500">{s.g}</td>
                  {/* E */}
                  <td className="px-2 py-3 text-center font-extrabold text-amber-400">{s.e}</td>
                  {/* P */}
                  <td className="px-2 py-3 text-center font-extrabold text-red-400">{s.p}</td>
                  {/* GF */}
                  <td className="px-2 py-3 text-center text-gray-400 font-semibold">{s.gf}</td>
                  {/* GC */}
                  <td className="px-2 py-3 text-center text-gray-400 font-semibold">{s.gc}</td>
                  {/* DG */}
                  <td className={`px-2 py-3 text-center font-extrabold ${dg > 0 ? 'text-green-500' : dg < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {dg > 0 ? `+${dg}` : dg}
                  </td>
                  {/* PTS */}
                  <td className="px-3 py-3 text-center font-black text-base text-sya-orange">{s.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 text-[10px] font-semibold text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Clasifica directamente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Posible mejor 3°
        </span>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const { user, profile } = useAuth();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [selectedGroup, setSelectedGroup] = useState('Grupo A');
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<number>>(new Set());
  const [selectedMatchForAudit, setSelectedMatchForAudit] = useState<Match | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const matchesRes = await fetch('/api/matches');
        const predictionsRes = await fetch(`/api/predictions?userId=${user.id}`);
        
        if (matchesRes.ok && predictionsRes.ok) {
          const matchesData = await matchesRes.json();
          const predictionsData = await predictionsRes.json();

          setMatches(matchesData.matches || []);
          
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
        console.error('Failed to load group stage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Handle query parameters for automatic group selection and scroll
  useEffect(() => {
    if (!loading) {
      const searchParams = new URLSearchParams(window.location.search);
      const groupParam = searchParams.get('group');
      const matchParam = searchParams.get('match');
      
      let normalizedGroup = groupParam;
      if (normalizedGroup && normalizedGroup.startsWith('Group ')) {
        normalizedGroup = normalizedGroup.replace('Group', 'Grupo');
      }

      if (normalizedGroup && GROUPS.includes(normalizedGroup)) {
        setSelectedGroup(normalizedGroup);
      }
      
      if (matchParam) {
        setTimeout(() => {
          const el = document.getElementById(`match-${matchParam}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-sya-orange', 'shadow-lg', 'shadow-sya-orange/20');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-sya-orange', 'shadow-lg', 'shadow-sya-orange/20');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [loading]);

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
        const data = await res.json();
        setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
        alert(data.error || 'No se pudo guardar la predicción.');
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

  // Filter matches for the selected group
  const filteredMatches = matches.filter((m) => {
    const groupNameEn = selectedGroup.replace('Grupo', 'Group');
    return (m.groupName === selectedGroup || m.groupName === groupNameEn) && m.status !== undefined && !['ROUND_32','ROUND_16','QUARTER','SEMI','THIRD_PLACE','FINAL'].includes((m as any).stage);
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Fase de Grupos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Seguí los resultados de la Fase de Grupos. Los pronósticos de la Fase Eliminatoria se cargan en la sección Eliminatorias.
        </p>
      </div>

      {/* Horizontal Scrollable Group Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedGroup === group
                ? 'bg-sya-orange text-white shadow-md'
                : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-300 hover:text-sya-orange dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando fixture de la Fase de Grupos...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold">
          No hay partidos importados en este grupo. Contactá al Administrador para importar el fixture.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMatches.map((match) => {
              const isFinished = match.status === 'FINISHED';
              const isLive = match.status === 'LIVE';
              const isToday = new Date(match.matchDate).toDateString() === new Date().toDateString();

              return (
                <div key={match.id} className="sya-glass p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden">

                  {/* Status bar on left */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                    isFinished ? 'bg-emerald-500' : isLive ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-700'
                  }`} />

                  {/* Match Header */}
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sya-orange" />
                      <span>{formatMatchDate(match.matchDate)}</span>
                    </div>
                    {isFinished ? (
                      <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Finalizado
                      </span>
                    ) : isLive ? (
                      <span className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold animate-pulse">
                        🔴 En Juego
                      </span>
                    ) : (
                      <span className="bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold">
                        Programado
                      </span>
                    )}
                  </div>

                  {/* Teams + Score display */}
                  <div className="flex items-center justify-between gap-2 py-1">
                    {/* Home */}
                    <div className={`flex-1 text-right font-extrabold text-sm sm:text-base truncate flex items-center justify-end gap-1.5 min-w-0 ${
                      isFinished && match.homeScore! > match.awayScore! ? 'text-emerald-500' : ''
                    }`}>
                      <span className="text-base sm:text-lg shrink-0" title={match.homeTeam}>{getFlagEmoji(match.homeTeam)}</span>
                      <span className="truncate" title={match.homeTeam}>{match.homeTeam}</span>
                    </div>

                    {/* Score or dash */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isFinished || isLive ? (
                        <>
                          <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 font-black text-xl sm:text-2xl">
                            {match.homeScore}
                          </span>
                          <span className="text-gray-300 font-black text-sm">-</span>
                          <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 font-black text-xl sm:text-2xl">
                            {match.awayScore}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-bold text-sm px-3">vs</span>
                      )}
                    </div>

                    {/* Away */}
                    <div className={`flex-1 text-left font-extrabold text-sm sm:text-base truncate flex items-center justify-start gap-1.5 min-w-0 ${
                      isFinished && match.awayScore! > match.homeScore! ? 'text-emerald-500' : ''
                    }`}>
                      <span className="text-base sm:text-lg shrink-0" title={match.awayTeam}>{getFlagEmoji(match.awayTeam)}</span>
                      <span className="truncate" title={match.awayTeam}>{match.awayTeam}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      {isFinished ? 'Resultado final' : isLive ? 'Parcial' : 'Sin resultado aún'}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Group Standings Table */}
          <GroupStandingsTable matches={filteredMatches} groupName={selectedGroup} />
        </>
      )}
    </div>
  );
}
