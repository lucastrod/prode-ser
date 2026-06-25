'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Award, Medal, Sparkles, Eye } from 'lucide-react';
import UserAuditPredictionsModal from '@/components/UserAuditPredictionsModal';


interface StandingRow {
  id: number;
  userId: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  user: { name: string };
}

export default function StandingsPage() {
  const { user } = useAuth();
  
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<{
    userId: string;
    userName: string;
    avatarUrl: string | null;
    totalPoints: number;
  } | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch('/api/standings');
        if (res.ok) {
          const data = await res.json();
          setStandings(data.standings || []);
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const getRankIndicator = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="w-8 h-8 rounded-full bg-amber-400 text-white font-extrabold flex items-center justify-center shadow-md animate-pulse">
            🥇
          </span>
        );
      case 2:
        return (
          <span className="w-8 h-8 rounded-full bg-slate-350 text-white font-extrabold flex items-center justify-center shadow-md">
            🥈
          </span>
        );
      case 3:
        return (
          <span className="w-8 h-8 rounded-full bg-amber-700 text-white font-extrabold flex items-center justify-center shadow-md">
            🥉
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-full bg-gray-500/10 text-gray-400 font-bold flex items-center justify-center border border-gray-200 dark:border-gray-800">
            {rank}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-[#1B199A] pl-3">
          Tabla de Posiciones
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Tabla general del torneo en tiempo real. Sumá puntos y escalá posiciones para llevarte los premios.
        </p>
      </div>

      {/* Leaderboard Podiums Showcase */}
      {standings.length >= 3 && (
        <section className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 pb-4">
          
          {/* 2nd place podium */}
          <div className="flex flex-col items-center justify-end">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 mb-1.5 shadow-sm bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xs uppercase text-gray-500">
              {(standings[1].user as any).avatarUrl ? (
                <img src={(standings[1].user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                standings[1].user.name[0]
              )}
            </div>
            <span className="text-sm font-bold text-gray-400 mb-1 truncate max-w-full">
              {standings[1].user.name}
            </span>
            <div className="w-20 h-20 bg-slate-100 dark:bg-[#1f2937]/50 rounded-2xl flex flex-col items-center justify-center shadow-inner relative border-t-4 border-slate-300">
              <span className="text-xl">🥈</span>
              <span className="text-xs text-gray-400 font-bold">2do</span>
              <span className="text-sm font-extrabold text-[#1B199A]">{standings[1].totalPoints} pts</span>
            </div>
          </div>

          {/* 1st place podium */}
          <div className="flex flex-col items-center justify-end scale-110">
            <div className="absolute top-[-16px] text-amber-400">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 mb-1.5 shadow-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-sm uppercase text-gray-500">
              {(standings[0].user as any).avatarUrl ? (
                <img src={(standings[0].user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                standings[0].user.name[0]
              )}
            </div>
            <span className="text-sm font-extrabold text-[#1B199A] mb-1 truncate max-w-full">
              {standings[0].user.name}
            </span>
            <div className="w-24 h-24 bg-amber-500/10 dark:bg-[#2e2612]/30 rounded-2xl flex flex-col items-center justify-center shadow-lg relative border-t-4 border-amber-400 sya-glass">
              <span className="text-2xl">🥇</span>
              <span className="text-xs text-amber-500 font-extrabold">1er Puesto</span>
              <span className="text-base font-extrabold text-[#1B199A]">{standings[0].totalPoints} pts</span>
            </div>
          </div>

          {/* 3rd place podium */}
          <div className="flex flex-col items-center justify-end">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-700 mb-1.5 shadow-sm bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xs uppercase text-gray-500">
              {(standings[2].user as any).avatarUrl ? (
                <img src={(standings[2].user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                standings[2].user.name[0]
              )}
            </div>
            <span className="text-sm font-bold text-gray-400 mb-1 truncate max-w-full">
              {standings[2].user.name}
            </span>
            <div className="w-20 h-20 bg-[#1f2937]/10 dark:bg-[#1f2937]/50 rounded-2xl flex flex-col items-center justify-center shadow-inner relative border-t-4 border-amber-700">
              <span className="text-xl">🥉</span>
              <span className="text-xs text-gray-400 font-bold">3ro</span>
              <span className="text-sm font-extrabold text-[#1B199A]">{standings[2].totalPoints} pts</span>
            </div>
          </div>

        </section>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando posiciones del torneo...
        </div>
      ) : standings.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold">
          No hay participantes registrados todavía en el torneo.
        </div>
      ) : (
        <div className="sya-glass overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-500/5 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-center w-20">Posición</th>
                  <th className="px-6 py-4">Participante</th>
                  <th className="px-6 py-4 text-center">Puntos</th>
                  <th className="px-6 py-4 text-center">Exactos</th>
                  <th className="px-6 py-4 text-center">Aciertos (Winner/Draw)</th>
                  <th className="px-6 py-4 text-center w-32">Predicciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {standings.map((row, idx) => {
                  const isCurrentUser = user && row.userId === user.id;
                  const rank = idx + 1;
                  return (
                    <tr 
                      key={row.id} 
                      className={`transition-colors ${
                        isCurrentUser 
                          ? 'bg-[#1B199A]/5 hover:bg-[#1B199A]/10 font-bold' 
                          : 'hover:bg-gray-500/5'
                      }`}
                    >
                      
                      {/* Rank Indicator */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {getRankIndicator(rank)}
                        </div>
                      </td>

                      {/* Participant Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#1B199A]/30 bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xs uppercase text-gray-500">
                            {(row.user as any).avatarUrl ? (
                              <img src={(row.user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              row.user.name[0]
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-sm sm:text-base">
                              {row.user.name}
                            </span>
                            {isCurrentUser && (
                              <span className="bg-[#1B199A] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                Vos
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="px-6 py-4 text-center font-black text-2xl text-[#1B199A]">
                        {row.totalPoints}
                      </td>

                      {/* Exacts */}
                      <td className="px-6 py-4 text-center font-extrabold text-xl text-green-500">
                        {row.exactScores}
                      </td>

                      {/* Outcomes */}
                      <td className="px-6 py-4 text-center font-extrabold text-xl text-blue-500">
                        {row.correctOutcomes}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedUserForAudit({
                            userId: row.userId,
                            userName: row.user.name,
                            avatarUrl: (row.user as any).avatarUrl || null,
                            totalPoints: row.totalPoints
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sya-orange/10 hover:bg-sya-orange/20 text-sya-orange font-bold text-xs rounded-xl transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUserForAudit && (
        <UserAuditPredictionsModal
          isOpen={!!selectedUserForAudit}
          onClose={() => setSelectedUserForAudit(null)}
          userId={selectedUserForAudit.userId}
          userName={selectedUserForAudit.userName}
          avatarUrl={selectedUserForAudit.avatarUrl}
          totalPoints={selectedUserForAudit.totalPoints}
        />
      )}

    </div>
  );
}
