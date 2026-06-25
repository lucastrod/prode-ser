'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, 
  Calendar, 
  HelpCircle, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  Clock,
  Edit2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import OtherPredictionsModal from '@/components/OtherPredictionsModal';

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
  id: number;
  matchId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  points: number | null;
}

interface MergedPrediction {
  match: Match;
  prediction: Prediction | null;
  status: 'Pendiente' | 'Bloqueado' | 'Finalizado' | 'Calculado';
  pointsEarned: number | null;
}

export default function PredictionsPage() {
  const { user } = useAuth();
  
  const [mergedList, setMergedList] = useState<MergedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, points: 0, exacts: 0, outcomes: 0 });
  const [selectedMatchForAudit, setSelectedMatchForAudit] = useState<Match | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadPredictionsData = async () => {
      try {
        const matchesRes = await fetch('/api/matches');
        const predictionsRes = await fetch(`/api/predictions?userId=${user.id}`);

        if (matchesRes.ok && predictionsRes.ok) {
          const matchesData = await matchesRes.json();
          const predictionsData = await predictionsRes.json();

          const matchesList: Match[] = matchesData.matches || [];
          const predictionsList: Prediction[] = predictionsData.predictions || [];

          // Create map for fast lookup
          const predsMap = new Map<number, Prediction>();
          predictionsList.forEach((p) => predsMap.set(p.matchId, p));

          const now = new Date();

          let totalPoints = 0;
          let exactCount = 0;
          let outcomeCount = 0;

          // Merge match details and predictions
          const merged: MergedPrediction[] = matchesList.map((match) => {
            const pred = predsMap.get(match.id) || null;
            const kickoff = new Date(match.matchDate);
            
            let status: MergedPrediction['status'] = 'Pendiente';
            let pointsEarned: number | null = null;

            if (match.status === 'FINISHED') {
              if (pred && pred.points !== null) {
                status = 'Calculado';
                pointsEarned = pred.points;
                if (pred.points === 3) exactCount++;
                if (pred.points === 1) outcomeCount++;
                totalPoints += pred.points;
              } else {
                status = 'Finalizado';
              }
            } else if (now >= new Date(kickoff.getTime() - 15 * 60000) || match.status === 'LIVE') {
              status = 'Bloqueado';
            } else {
              status = 'Pendiente';
            }

            return {
              match,
              prediction: pred,
              status,
              pointsEarned,
            };
          });

          // Sort predictions: locked/finished first, then by date asc
          merged.sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime());

          setMergedList(merged);
          setStats({
            total: predictionsList.length,
            points: totalPoints,
            exacts: exactCount,
            outcomes: outcomeCount,
          });
        }
      } catch (err) {
        console.error('Failed to load predictions list:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPredictionsData();
  }, [user]);

  const getStatusBadge = (status: MergedPrediction['status']) => {
    switch (status) {
      case 'Calculado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Calculado
          </span>
        );
      case 'Finalizado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
            <Clock className="w-3.5 h-3.5" />
            Finalizado
          </span>
        );
      case 'Bloqueado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
            <Lock className="w-3.5 h-3.5" />
            Bloqueado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-500/10 text-gray-500 text-xs font-bold border border-gray-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            Pendiente
          </span>
        );
    }
  };

  const getPointsBadge = (points: number | null) => {
    if (points === null) return <span className="text-gray-400 font-bold">-</span>;
    if (points === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-extrabold shadow-sm animate-pulse">
          <Award className="w-3.5 h-3.5" />
          +3 Puntos
        </span>
      );
    }
    if (points === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sya-blue text-white text-xs font-bold shadow-sm">
          +1 Punto
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-500/20 text-gray-500 text-xs font-bold">
        0 Puntos
      </span>
    );
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

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Mis Pronósticos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Historial completo de tus pronósticos y puntajes calculados.
        </p>
      </div>

      {/* Stats Summary Widgets */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="sya-glass p-5 text-center">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Pronósticos</span>
          <span className="text-2xl font-extrabold text-gray-800 dark:text-white">{stats.total}</span>
        </div>
        <div className="sya-glass p-5 text-center border-t-4 border-sya-blue">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Puntos Totales</span>
          <span className="text-2xl font-extrabold text-sya-blue">{stats.points}</span>
        </div>
        <div className="sya-glass p-5 text-center border-t-4 border-green-500">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Aciertos Exactos</span>
          <span className="text-2xl font-extrabold text-green-500">{stats.exacts}</span>
        </div>
        <div className="sya-glass p-5 text-center border-t-4 border-sya-orange">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Resultado (Ganador/Empate)</span>
          <span className="text-2xl font-extrabold text-sya-orange">{stats.outcomes}</span>
        </div>
      </section>

      {/* Predictions Table/List */}
      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando tus pronósticos...
        </div>
      ) : mergedList.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold">
          Aún no realizaste ninguna predicción. ¡Comenzá cargando algunas en la Fase de Grupos!
        </div>
      ) : (
        <div className="sya-glass overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-500/5 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4">Partido</th>
                  <th className="px-6 py-4 text-center">Mi Pronóstico</th>
                  <th className="px-6 py-4 text-center">Oficial</th>
                  <th className="px-6 py-4 text-center">Puntos</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-center w-36">Predicciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {mergedList.map((row) => (
                  <tr key={row.match.id} className="hover:bg-gray-500/5 transition-colors">
                    
                    {/* Teams / Group / Date */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="font-extrabold text-sm sm:text-base">
                          {row.match.homeTeam} vs {row.match.awayTeam}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                          <span className="bg-sya-orange/10 text-sya-orange px-2 py-0.5 rounded-full text-[10px] uppercase">
                            {row.match.groupName}
                          </span>
                          <span>•</span>
                          <span>{formatMatchDate(row.match.matchDate)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Predicted Score */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {row.prediction ? (
                          <span className="inline-block px-3 py-1.5 bg-gray-500/10 rounded-xl font-extrabold text-sm sm:text-base text-gray-700 dark:text-gray-300">
                            {row.prediction.predictedHomeScore} - {row.prediction.predictedAwayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-bold italic mt-1">
                            Sin pronóstico
                          </span>
                        )}
                        {row.status === 'Pendiente' && (
                          <Link href={`/groups?group=${encodeURIComponent(row.match.groupName)}&match=${row.match.id}`} className="text-[10px] text-sya-blue hover:text-sya-orange hover:underline font-bold flex items-center gap-1 transition-colors">
                            <Edit2 className="w-2.5 h-2.5" />
                            Modificar
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Official Score */}
                    <td className="px-6 py-4 text-center font-extrabold text-sm sm:text-base">
                      {row.match.status === 'FINISHED' ? (
                        <span className="text-sya-blue">
                          {row.match.homeScore} - {row.match.awayScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">-</span>
                      )}
                    </td>

                    {/* Points Gained */}
                    <td className="px-6 py-4 text-center">
                      {getPointsBadge(row.pointsEarned)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(row.status)}
                    </td>

                    {/* Community Predictions */}
                    <td className="px-6 py-4 text-center">
                      {row.status !== 'Pendiente' ? (
                        <button
                          onClick={() => setSelectedMatchForAudit(row.match)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sya-orange/10 hover:bg-sya-orange/20 text-sya-orange font-bold text-xs rounded-xl transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold italic">Cierra 15m antes</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
