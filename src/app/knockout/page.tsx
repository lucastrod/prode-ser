'use client';

import React, { useEffect, useState } from 'react';
import { Swords, Trophy, Clock, CheckCircle } from 'lucide-react';

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

const STAGE_LABELS: Record<string, string> = {
  ROUND_32: 'Round of 32',
  ROUND_16: 'Octavos de Final',
  QUARTER: 'Cuartos de Final',
  SEMI: 'Semifinales',
  THIRD_PLACE: '3er Puesto',
  FINAL: 'Gran Final',
};

const STAGE_ORDER = ['ROUND_32', 'ROUND_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];

function MatchCard({ match }: { match: KnockoutMatch }) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const isPlaceholder = match.homeTeam.startsWith('[') || match.awayTeam.startsWith('[') || match.homeTeam.startsWith('W') || match.awayTeam.startsWith('W') || match.homeTeam.startsWith('L') || match.awayTeam.startsWith('L');

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
    <div className={`sya-glass overflow-hidden transition-all duration-300 hover:translate-y-[-2px] ${
      isLive ? 'ring-2 ring-amber-400' : isFinished ? 'ring-1 ring-emerald-400/30' : ''
    }`}>
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
  );
}

export default function KnockoutPage() {
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('ROUND_32');

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => {
        const all: KnockoutMatch[] = (d.matches || []).filter(
          (m: KnockoutMatch) => m.stage !== 'GROUP'
        );
        setMatches(all);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasAnyKnockoutMatches = matches.length > 0;
  const filteredMatches = matches.filter((m) => m.stage === activeStage);

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
        <div className="sya-glass p-16 text-center space-y-4">
          <Trophy className="w-16 h-16 text-sya-orange/30 mx-auto" />
          <p className="text-gray-400 font-semibold text-lg">La fase eliminatoria aún no comenzó.</p>
          <p className="text-gray-500 text-sm">Los cruces se generarán al finalizar la Fase de Grupos el 27 de junio.</p>
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
                    : 'bg-white dark:bg-[#111827] text-gray-500 hover:text-sya-orange border border-gray-200 dark:border-gray-800'
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
                <MatchCard key={match.id} match={match} />
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
    </div>
  );
}
