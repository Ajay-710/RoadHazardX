import React from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

const DashboardScreen = ({ isActive, navigateTo, hazards, currentUser, toggleSidebar }) => {
    const { t } = useLanguage();
    if (!isActive) return null;

    const userHazards = hazards.filter(h => {
        if (!currentUser || !currentUser.uid) return false;
        return h.userId === currentUser.uid || h.user_id === currentUser.uid;
    });
    const activeHazards = userHazards.filter(h => !h.resolved);
    const resolvedHazards = userHazards.filter(h => h.resolved);
    const handleFleetUpload = (e) => { e.preventDefault(); alert("Fleet tracking not available yet."); };

    // AI Stats Calculation
    const typeDistribution = userHazards.reduce((acc, h) => {
        acc[h.type] = (acc[h.type] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.entries(typeDistribution)
        .sort(([, a], [, b]) => b - a);

    const stats = {
        total: userHazards.length,
        active: activeHazards.length,
        avgConf: userHazards.length ? (userHazards.reduce((acc, h) => acc + (h.confidence || 0), 0) / userHazards.length).toFixed(1) : 0
    };

    return (
        <section className="absolute inset-0 z-10 animate-fade-in flex flex-col bg-[#020617] overflow-hidden no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between p-6 shrink-0 bg-transparent flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigateTo('home')}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/15 transition-all active:scale-90 group"
                    >
                        <span className="material-icons-round text-slate-400 group-hover:text-white transition-colors">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-white">{t('dashboardTitle')}</h2>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                     <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</span>
                          <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              Real-time Monitoring Active
                          </span>
                     </div>
                     <div className="w-px h-8 bg-white/10 mx-2"></div>
                     <button onClick={toggleSidebar} className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden shadow-lg transition-transform hover:scale-105 active:scale-95">
                         {currentUser?.photoURL ? (
                             <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                                 <span className="material-icons-round text-white text-[20px]">person</span>
                             </div>
                         )}
                     </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 px-6 mb-6">
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-white">{stats.total}</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">{t('statsReports')}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-orange-500">
                    <span className="text-3xl font-bold text-white">{stats.active}</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">{t('statsWarning')}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-cyan-500">
                    <span className="text-3xl font-bold text-white">{stats.avgConf}%</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">{t('statsConfidence')}</span>
                </div>
            </div>

            {/* AI Insights & Distribution Panel */}
            <div className="px-6 mb-6 shrink-0">
                <div className="glass-panel p-5 rounded-3xl bg-gradient-to-br from-white/5 to-white/2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="material-icons-round text-blue-400 text-sm">analytics</span>
                           {t('distribution')}
                        </h3>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/20 transition-all flex items-center gap-1.5">
                                <span className="material-icons-round text-[12px]">local_shipping</span>
                                Fleet Plan
                                <input type="file" accept=".json" onChange={handleFleetUpload} className="hidden" />
                            </label>
                            <span className="text-[10px] text-gray-500 font-mono italic">AI-Processed</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {sortedTypes.map(([type, count], i) => {
                            const percent = (count / (userHazards.length || 1) * 100).toFixed(0);
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-sm font-medium text-gray-200 truncate pr-4">{type}</span>
                                        <span className="text-xs font-bold text-gray-400">{percent}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 ease-out"
                                            style={{ width: `${percent}%`, transitionDelay: `${i * 150}ms` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* Hazard Telemetry (User's specific reports) */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 no-scrollbar">
                <h3 className="text-lg font-semibold text-gray-200 sticky top-0 bg-[#020617] py-2 z-10 flex items-center gap-2">
                    <span className="material-icons-round text-blue-400">history_edu</span>
                    {t('hazardLogs')}
                </h3>

                {userHazards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <span className="material-icons-round text-4xl mb-2">check_circle</span>
                        <p>{t('noReports')}</p>
                    </div>
                ) : (
                    userHazards.map((hazard, index) => (
                        <div key={index} className="glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden shrink-0 border border-white/10">
                                {hazard.image ? (
                                    <img src={hazard.image} alt={hazard.type} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-icons-round text-gray-500">image_not_supported</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col mb-1">
                                    <h4 className={`font-bold truncate ${hazard.resolved ? 'text-gray-400 line-through' : 'text-white'}`}>{hazard.type}</h4>
                                    <div className="mt-1 flex items-center gap-2">
                                        {hazard.resolved ? (
                                            <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded font-bold uppercase border border-green-500/30 flex items-center gap-1 w-fit">
                                                <span className="material-icons-round text-[10px]">check_circle</span>
                                                Resolved
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold uppercase border border-red-500/30 w-fit">
                                                High Priority
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-300 flex items-center gap-1 mt-2">
                                    <span className="material-icons-round text-[12px]">location_on</span>
                                    {hazard.lat?.toFixed(4) || 0}, {hazard.lng?.toFixed(4) || 0}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-mono">
                                    Node: Cloud-Sync
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2 pr-2">
                                {!hazard.resolved && hazard.id && (
                                    <button 
                                        className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/30 text-green-400 text-xs font-bold transition-all border border-green-500/30 shadow-lg"
                                        onClick={async () => {
                                            try {
                                                const docRef = doc(db, 'hazards', hazard.id);
                                                await updateDoc(docRef, { resolved: true });
                                            } catch (error) {
                                                console.error("Failed to mark resolved", error);
                                                alert("Error updating status via Firebase. Check console.");
                                            }
                                        }}
                                    >
                                        {t('markFixed')}
                                    </button>
                                )}
                                <button 
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-gray-300 hover:text-white transition-colors flex items-center justify-center w-8 h-8" 
                                    title={t('viewOnMap')}
                                    onClick={() => navigateTo('map')}
                                >
                                    <span className="material-icons-round text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-transparent opacity-50 shrink-0"></div>
        </section>
    );
};

export default DashboardScreen;
