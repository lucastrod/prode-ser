'use client';

import React, { useEffect, useState } from 'react';
import { Swords, Trophy, Clock, CheckCircle, Eye, Save, Edit2, AlertCircle } from 'lucide-react';
import OtherPredictionsModal from '@/components/OtherPredictionsModal';
import { useAuth } from '@/context/AuthContext';
import { getFlagEmoji } from '@/app/page';

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

const STAGE_ORDER = ['ROUND_32', 'ROUND_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];

function MatchCard({
  match,
  prediction,
  saveState,
  savedMatchIds,
  onShowPredictions,
  onScoreChange,
  onSave,
}: {
  match: KnockoutMatch;
  prediction?: Prediction;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  savedMatchIds?: Set<number>;
  onShowPredictions?: (m: KnockoutMatch) => void;
  onScoreChange?: (matchId: number, team: 'home' | 'away', val: string) => void;
  onSave?: (matchId: number) => void;
}) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const isPlaceholder = match.homeTeam.startsWith('[') || match.awayTeam.startsWith('[');

  const matchDate = new Date(match.matchDate);
  const now = new Date();
  const isLocked = now >= new Date(matchDate.getTime() - 15 * 60000) || match.status === 'LIVE' || match.status === 'FINISHED';
  const canPredict = match.stage === 'ROUND_32' && !isLocked && !isPlaceholder;

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

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ].includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const pred = prediction || { predictedHomeScore: '', predictedAwayScore: '' };
  const state = saveState || 'idle';
  const alreadySaved = savedMatchIds?.has(match.id) || false;

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
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-base sm:text-lg shrink-0" title={match.homeTeam.replace(/^\[|\]$/g, '')}>{getFlagEmoji(match.homeTeam)}</span>
              <span className={`font-bold text-sm truncate ${
                homeWins ? 'text-blue-600 dark:text-blue-400' : ''
              } ${isPlaceholder && match.homeTeam.startsWith('[') ? 'text-gray-400 italic text-xs' : ''}`}>
                {match.homeTeam.replace(/^\[|\]$/g, '')}
              </span>
            </div>
            {isFinished && (
              <span className={`text-lg font-black w-7 text-center ${homeWins ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
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
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-base sm:text-lg shrink-0" title={match.awayTeam.replace(/^\[|\]$/g, '')}>{getFlagEmoji(match.awayTeam)}</span>
              <span className={`font-bold text-sm truncate ${
                awayWins ? 'text-blue-600 dark:text-blue-400' : ''
              } ${isPlaceholder && match.awayTeam.startsWith('[') ? 'text-gray-400 italic text-xs' : ''}`}>
                {match.awayTeam.replace(/^\[|\]$/g, '')}
              </span>
            </div>
            {isFinished && (
              <span className={`text-lg font-black w-7 text-center ${awayWins ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                {match.awayScore}
              </span>
            )}
            {awayWins && <span className="text-[9px] bg-sya-orange text-white px-1.5 py-0.5 rounded-full font-black">✓</span>}
          </div>
        </div>

        {/* Prediction input zone — ROUND_32 only, not yet locked */}
        {canPredict && onScoreChange && onSave && (
          <div className="px-4 pb-3 border-t border-gray-200 dark:border-gray-800 pt-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Tu pronóstico</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="-"
                value={pred.predictedHomeScore}
                onChange={(e) => onScoreChange(match.id, 'home', e.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-12 h-10 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sya-orange font-black text-xl no-spinner"
              />
              <span className="text-gray-400 font-extrabold text-xs">-</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="-"
                value={pred.predictedAwayScore}
                onChange={(e) => onScoreChange(match.id, 'away', e.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-12 h-10 text-center bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sya-orange font-black text-xl no-spinner"
              />
              <button
                onClick={() => onSave(match.id)}
                disabled={state === 'saving'}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  state === 'saved'
                    ? 'bg-green-500 text-white'
                    : state === 'error'
                    ? 'bg-red-500 text-white'
                    : alreadySaved
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-sya-orange hover:bg-sya-orange-hover text-white'
                }`}
              >
                {state === 'saving' ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : state === 'saved' ? (
                  <><CheckCircle className="w-3 h-3" /><span>Guardado</span></>
                ) : state === 'error' ? (
                  <><AlertCircle className="w-3 h-3" /><span>Error</span></>
                ) : (
                  <>{alreadySaved ? <Edit2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}<span>{alreadySaved ? 'Editar' : 'Predecir'}</span></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Locked prediction display */}
        {!canPredict && !isFinished && !isLive && !isPlaceholder && match.stage === 'ROUND_32' && (
          <div className="px-4 pb-3 border-t border-gray-200 dark:border-gray-800 pt-3">
            <p className="text-[10px] text-amber-400 font-bold uppercase">🔒 Pronóstico bloqueado</p>
          </div>
        )}
      </div>

      {isLocked && !isPlaceholder && onShowPredictions && (
        <button
          onClick={() => onShowPredictions(match)}
          className="w-full py-2 bg-gray-500/5 hover:bg-sya-orange/10 hover:text-blue-600 dark:hover:text-blue-400 text-gray-400 font-bold text-[9px] uppercase tracking-wider border-t border-gray-200 dark:border-gray-800 flex items-center justify-center gap-1 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Predicciones</span>
        </button>
      )}
    </div>
  );
}

export default function KnockoutPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('ROUND_32');
  const [selectedMatchForAudit, setSelectedMatchForAudit] = useState<KnockoutMatch | null>(null);

  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [saveStates, setSaveStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const matchesRes = await fetch('/api/matches');
        const d = await matchesRes.json();
        const all: KnockoutMatch[] = (d.matches || []).filter(
          (m: KnockoutMatch) => m.stage !== 'GROUP'
        );
        setMatches(all);

        if (user) {
          const predsRes = await fetch(`/api/predictions?userId=${user.id}`);
          if (predsRes.ok) {
            const predsData = await predsRes.json();
            const predsMap: Record<number, Prediction> = {};
            const savedIds = new Set<number>();
            (predsData.predictions || []).forEach((p: any) => {
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
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

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
    } catch {
      setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
    }
  };

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
          Cargá tus pronósticos para los 16vos y seguí el fixture de la fase eliminatoria del Mundial 2026.
        </p>
      </div>

      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando bracket eliminatorio...
        </div>
      ) : !hasAnyKnockoutMatches ? (
        <div className="sya-glass p-16 text-center space-y-4">
          <Trophy className="w-16 h-16 text-blue-600/30 dark:text-blue-400/30 mx-auto" />
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
                    : 'bg-white dark:bg-[#111827] text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-800'
                }`}
              >
                {STAGE_LABELS[stage] || stage}
              </button>
            ))}
          </div>

          {/* Stage Title */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              {STAGE_LABELS[activeStage]}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Hint for ROUND_32 */}
          {activeStage === 'ROUND_32' && user && (
            <p className="text-xs text-gray-400 font-semibold text-center">
              Ingresá tu marcador predicho en cada partido y presioná <strong>Predecir</strong> para guardar.
            </p>
          )}

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
                  prediction={predictions[match.id]}
                  saveState={saveStates[match.id]}
                  savedMatchIds={savedMatchIds}
                  onShowPredictions={(m) => setSelectedMatchForAudit(m)}
                  onScoreChange={handleScoreChange}
                  onSave={handleSavePrediction}
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
