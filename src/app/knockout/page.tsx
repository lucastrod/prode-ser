'use client';

import React, { useEffect, useState } from 'react';
import { Swords, Trophy, Clock, CheckCircle, Lock, Star, ArrowRight, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import OtherPredictionsModal from '@/components/OtherPredictionsModal';

interface KnockoutMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  stage: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: string | null;
}

interface GroupMatch {
  id: number;
  groupName: string;
  stage?: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
}

const STAGE_LABELS: Record<string, string> = {
  ROUND_32: 'Round of 32',
  ROUND_16: 'Octavos de Final',
  QUARTER: 'Cuartos de Final',
  SEMI: 'Semifinales',
  THIRD_PLACE: '3er Puesto',
  FINAL: 'Gran Final',
};

const STAGE_ORDER = ['ROUND_32', 'ROUND_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];

const ALL_GROUPS = [
  'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F',
  'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L',
  'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
  'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L',
];

// Deduplicated canonical group list (A-L)
const CANONICAL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function MatchCard({ match, onShowPredictions }: { match: KnockoutMatch; onShowPredictions?: (m: KnockoutMatch) => void }) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const isPlaceholder = match.homeTeam.startsWith('[') || match.awayTeam.startsWith('[') || match.homeTeam.startsWith('W') || match.awayTeam.startsWith('W') || match.homeTeam.startsWith('L') || match.awayTeam.startsWith('L');

  const matchDate = new Date(match.matchDate);
  const now = new Date();
  const isLocked = now >= new Date(matchDate.getTime() - 15 * 60000) || match.status === 'LIVE' || match.status === 'FINISHED';

  const getWinner = (side: 'home' | 'away') => {
    if (!isFinished || match.homeScore === null || match.awayScore === null) return false;
    if (match.penaltyWinner) return match.penaltyWinner === side;
    return side === 'home' ? match.homeScore > match.awayScore : match.awayScore > match.homeScore;
  };

  const homeWins = getWinner('home');
  const awayWins = getWinner('away');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`sya-glass overflow-hidden transition-all duration-300 hover:translate-y-[-2px] flex flex-col justify-between ${
      isLive ? 'ring-2 ring-amber-400' : isFinished ? 'ring-1 ring-emerald-400/30' : ''
    }`}>
      <div>
        {/* Status + Date header */}
        <div className={`px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 ${
          isLive ? 'bg-amber-400/10 text-amber-400' : isFinished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/5 text-gray-400'
        }`}>
          <span className="flex items-center gap-1">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />}
            {isFinished && <CheckCircle className="w-3 h-3" />}
            {!isFinished && !isLive && <Clock className="w-3 h-3" />}
            {isLive ? 'En Juego' : isFinished ? 'Finalizado' : 'Programado'}
          </span>
          <span>{formatDate(match.matchDate)}</span>
        </div>

        {/* Teams */}
        <div className="px-4 py-3 space-y-2">
          {/* Home */}
          <div className={`flex items-center justify-between gap-2 ${
            isFinished && !homeWins ? 'opacity-50' : ''
          }`}>
            <span className={`font-bold text-sm truncate flex-1 ${
              homeWins ? 'text-sya-orange' : ''
            } ${isPlaceholder ? 'text-gray-400 italic text-xs' : ''}`}>
              {match.homeTeam.replace(/^\[|\]$/g, '')}
            </span>
            {isFinished && (
              <span className={`text-lg font-black w-7 text-center ${homeWins ? 'text-sya-orange' : 'text-gray-400'}`}>
                {match.homeScore}
              </span>
            )}
            {homeWins && <span className="text-[9px] bg-sya-orange text-white px-1.5 py-0.5 rounded-full font-black">✓</span>}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-[10px] font-black text-gray-400">VS</span>
            {match.penaltyWinner && (
              <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full font-bold border border-purple-500/20">
                PEN
              </span>
            )}
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Away */}
          <div className={`flex items-center justify-between gap-2 ${
            isFinished && !awayWins ? 'opacity-50' : ''
          }`}>
            <span className={`font-bold text-sm truncate flex-1 ${
              awayWins ? 'text-sya-orange' : ''
            } ${isPlaceholder ? 'text-gray-400 italic text-xs' : ''}`}>
              {match.awayTeam.replace(/^\[|\]$/g, '')}
            </span>
            {isFinished && (
              <span className={`text-lg font-black w-7 text-center ${awayWins ? 'text-sya-orange' : 'text-gray-400'}`}>
                {match.awayScore}
              </span>
            )}
            {awayWins && <span className="text-[9px] bg-sya-orange text-white px-1.5 py-0.5 rounded-full font-black">✓</span>}
          </div>
        </div>
      </div>

      {isLocked && !isPlaceholder && onShowPredictions && (
        <button
          onClick={() => onShowPredictions(match)}
          className="w-full py-2 bg-gray-500/5 hover:bg-sya-orange/10 hover:text-sya-orange text-gray-400 font-bold text-[9px] uppercase tracking-wider border-t border-gray-200 dark:border-gray-800 flex items-center justify-center gap-1 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Predicciones</span>
        </button>
      )}
    </div>
  );
}

// ─── "Coming Soon" overlay when group stage is not complete ──────────────────
function ComingSoonOverlay({ groupsCompleted, totalGroups }: { groupsCompleted: number; totalGroups: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.55)' }}>
      <div className="relative max-w-md w-full">
        {/* Glow */}
        <div className="absolute -inset-4 rounded-3xl bg-sya-orange/20 blur-2xl pointer-events-none" />

        <div className="relative sya-glass rounded-2xl p-10 text-center space-y-6 border border-sya-orange/30">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-sya-orange/10 border-2 border-sya-orange/30 flex items-center justify-center">
              <Lock className="w-9 h-9 text-sya-orange" />
            </div>
          </div>

          {/* Stars decoration */}
          <div className="flex justify-center gap-3">
            <Star className="w-4 h-4 text-sya-orange/40" />
            <Star className="w-5 h-5 text-sya-orange" />
            <Star className="w-4 h-4 text-sya-orange/40" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black font-serif tracking-tight">Próximamente</h2>
            <p className="text-base font-extrabold text-sya-orange uppercase tracking-wider">Fase Eliminatoria</p>
          </div>

          <p className="text-sm text-gray-400 font-medium leading-relaxed">
            Esta sección se habilitará para predicciones una vez que todos los grupos de la Fase de Grupos queden formados y los cruces estén definidos.
          </p>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>Grupos completados</span>
              <span className="text-sya-orange">{groupsCompleted} / {totalGroups}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sya-orange to-amber-400 transition-all duration-700"
                style={{ width: `${totalGroups > 0 ? (groupsCompleted / totalGroups) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sya-orange hover:bg-sya-orange-hover text-white font-bold text-sm transition-all shadow-lg shadow-sya-orange/20 hover:shadow-sya-orange/40 group"
          >
            <span>Ver Fase de Grupos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function KnockoutPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [allMatches, setAllMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('ROUND_32');
  const [selectedMatchForAudit, setSelectedMatchForAudit] = useState<KnockoutMatch | null>(null);

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => {
        const all: GroupMatch[] = d.matches || [];
        setAllMatches(all);

        const knockout: KnockoutMatch[] = all.filter(
          (m: any) => m.stage && m.stage !== 'GROUP'
        ) as KnockoutMatch[];
        setMatches(knockout);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Determine how many canonical groups have at least 3 finished matches (all 3 group games done)
  const groupCompletionMap: Record<string, number> = {};
  for (const m of allMatches) {
    if (!m.groupName) continue;
    if ((m as any).stage && (m as any).stage !== 'GROUP') continue;
    // Normalize group name letter
    const letter = m.groupName.replace(/^(Group|Grupo)\s+/i, '').toUpperCase();
    if (!CANONICAL_GROUPS.includes(letter)) continue;
    if (m.status === 'FINISHED') {
      groupCompletionMap[letter] = (groupCompletionMap[letter] || 0) + 1;
    }
  }

  // A group is "complete" if it has at least 3 finished matches (each team plays 3 in group stage)
  const completedGroups = CANONICAL_GROUPS.filter((g) => (groupCompletionMap[g] || 0) >= 3).length;
  const totalGroups = CANONICAL_GROUPS.length;
  const allGroupsComplete = completedGroups >= totalGroups;

  const showKnockouts = process.env.NEXT_PUBLIC_SHOW_KNOCKOUTS !== 'false';
  const hasAnyKnockoutMatches = matches.length > 0 && showKnockouts;
  const filteredMatches = matches.filter((m) => m.stage === activeStage);

  // Show overlay only for non-admins when groups are not complete AND no knockout matches exist
  const showOverlay = !loading && !allGroupsComplete && !hasAnyKnockoutMatches && profile?.role !== 'ADMIN';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3 flex items-center gap-3">
          <Swords className="w-7 h-7 text-sya-orange" />
          Fase Eliminatoria
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Resultados y fixture de la fase eliminatoria del Mundial 2026. El ganador avanza, el perdedor queda afuera.
        </p>
      </div>

      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando bracket eliminatorio...
        </div>
      ) : !hasAnyKnockoutMatches ? (
        /* Próximamente banner when no knockout matches are loaded yet */
        <div className="flex flex-col items-center justify-center py-12 space-y-8">
          <div className="relative max-w-md w-full">
            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="relative sya-glass rounded-2xl p-10 text-center space-y-6 border border-amber-500/30">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                  <Lock className="w-9 h-9 text-amber-500" />
                </div>
              </div>
              {/* Stars decoration */}
              <div className="flex justify-center gap-3">
                <Star className="w-4 h-4 text-amber-500/40" />
                <Star className="w-5 h-5 text-amber-500" />
                <Star className="w-4 h-4 text-amber-500/40" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black font-serif tracking-tight">Próximamente</h2>
                <p className="text-base font-extrabold text-amber-500 uppercase tracking-wider">Fase Eliminatoria</p>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-400 font-medium leading-relaxed">
                Las llaves de la Fase Eliminatoria se publicarán en breve. ¡Prepará tus pronósticos!
              </p>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                  <span>Procesando fixture</span>
                  <span className="text-amber-500">Casi listo</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700 animate-pulse"
                    style={{ width: `85%` }}
                  />
                </div>
              </div>
              <Link
                href="/groups"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1B199A] hover:bg-[#342ede] text-white font-bold text-sm transition-all shadow-lg shadow-[#1B199A]/20 hover:shadow-[#1B199A]/40 group cursor-pointer"
              >
                <span>Ver Fase de Grupos</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stage Selector Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {STAGE_ORDER.map((stage) => (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`px-5 py-2.5 rounded-full font-bold text-xs shrink-0 transition-all duration-200 ${
                  activeStage === stage
                    ? 'bg-sya-orange text-white shadow-md shadow-sya-orange/30'
                    : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-300 hover:text-sya-orange dark:hover:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                {STAGE_LABELS[stage] || stage}
              </button>
            ))}
          </div>

          {/* Stage Title */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-black text-sya-orange uppercase tracking-widest">
              {STAGE_LABELS[activeStage]}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Match Grid or Placeholder */}
          {filteredMatches.length === 0 ? (
            <div className="sya-glass p-12 text-center space-y-4">
              <Trophy className="w-12 h-12 text-sya-orange/30 mx-auto" />
              <p className="text-gray-400 font-semibold">Los cruces de esta fase aún no están definidos.</p>
              <p className="text-gray-500 text-xs">Se generarán automáticamente una vez completada la ronda anterior y resueltos los partidos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMatches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onShowPredictions={(m) => setSelectedMatchForAudit(m)} 
                />
              ))}
            </div>
          )}

          {/* PEN Legend */}
          {filteredMatches.some((m) => m.penaltyWinner) && (
            <div className="text-xs text-gray-400 font-semibold flex items-center gap-2 mt-4">
              <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">PEN</span>
              Partido definido por penales. El marcador muestra el resultado al final del tiempo reglamentario + prórroga.
            </div>
          )}
        </>
      )}

      {/* Coming Soon Overlay */}
      {showOverlay && (
        <ComingSoonOverlay groupsCompleted={completedGroups} totalGroups={totalGroups} />
      )}

      {selectedMatchForAudit && (
        <OtherPredictionsModal
          isOpen={!!selectedMatchForAudit}
          onClose={() => setSelectedMatchForAudit(null)}
          matchId={selectedMatchForAudit.id}
          homeTeam={selectedMatchForAudit.homeTeam}
          awayTeam={selectedMatchForAudit.awayTeam}
          matchDate={selectedMatchForAudit.matchDate}
          homeScore={selectedMatchForAudit.homeScore}
          awayScore={selectedMatchForAudit.awayScore}
        />
      )}
    </div>
  );
}
