import React from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const DashboardScreen = ({ isActive, navigateTo, hazards }) => {
    if (!isActive) return null;

    const activeHazards = hazards.filter(h => !h.resolved);
    const resolvedHazards = hazards.filter(h => h.resolved);

    // AI Stats Calculation
    const typeDistribution = hazards.reduce((acc, h) => {
        acc[h.type] = (acc[h.type] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.entries(typeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const avgConfidence = hazards.length > 0 
        ? (hazards.reduce((sum, h) => sum + (h.confidence || 0.85), 0) / hazards.length * 100).toFixed(1)
        : 0;

    const stats = {
        total: hazards.length,
        active: activeHazards.length,
        resolved: resolvedHazards.length,
        avgConf: avgConfidence
    };

    return (
        <section className="absolute inset-0 flex flex-col bg-[#020617] z-10 animate-fade-in overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            {/* Header / Top Bar */}
            <div className="relative z-20 flex items-center justify-between px-8 py-6 backdrop-blur-md border-b border-white/5 bg-slate-950/20">
                <div className="flex items-center gap-6">
                    <button
                        className="group w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/20 active:scale-95 shadow-2xl"
                        onClick={() => navigateTo('home')}
                    >
                        <span className="material-icons-round text-slate-400 group-hover:text-white transition-colors">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            Account Dashboard
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/30 uppercase tracking-[0.2em] font-black">Secure</span>
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Municipal Safety Node // v3.2.0</p>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                     <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</span>
                         <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 mt-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                             Real-time Monitoring Active
                         </span>
                     </div>
                </div>
            </div>

            <div className="relative z-20 flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                
                {/* Main Intel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:col-span-1">
                        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-[32px] border border-white/5 shadow-2xl space-y-2 group hover:bg-slate-900/60 transition-all duration-500">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Reports</span>
                             <div className="flex items-baseline gap-2">
                                 <span className="text-4xl font-black text-white">{stats.total}</span>
                                 <span className="text-xs font-bold text-slate-600">UNITS</span>
                             </div>
                             <div className="w-12 h-1 bg-white/10 rounded-full group-hover:bg-white/20 transition-all"></div>
                        </div>
                        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-[32px] border border-white/5 shadow-2xl space-y-2 group hover:bg-slate-900/60 transition-all duration-500">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
                             <div className="flex items-baseline gap-2">
                                 <span className="text-4xl font-black text-orange-500 pr-1">{stats.active}</span>
                             </div>
                             <div className="w-12 h-1 bg-orange-500/20 rounded-full group-hover:bg-orange-500/40 transition-all"></div>
                        </div>
                    </div>

                    {/* AI Distribution Chart Card */}
                    <div className="md:col-span-2 bg-linear-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                             <div>
                                 <h3 className="text-sm font-bold text-white uppercase tracking-widest">Incident Intelligence</h3>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Cross-referenced via Clip-ViT-B/32</p>
                             </div>
                             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                 <span className="material-icons-round text-blue-500 text-lg">psychology</span>
                             </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            {sortedTypes.length > 0 ? sortedTypes.map(([type, count], i) => {
                                const percent = (count / (hazards.length || 1) * 100).toFixed(0);
                                return (
                                    <div key={i} className="group cursor-default">
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{type}</span>
                                            <span className="text-[10px] font-black text-slate-500">{percent}%</span>
                                        </div>
                                        <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1.5px] border border-white/5">
                                            <div 
                                                className="h-full bg-linear-to-r from-blue-600 via-cyan-400 to-blue-400 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all duration-[1.5s] ease-out-expo"
                                                style={{ width: `${percent}%`, transitionDelay: `${i * 100}ms` }}
                                            />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                                     <span className="text-xs font-black uppercase tracking-widest text-slate-500">Awaiting Telemetry Data</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Confidence Meter Card */}
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col items-center justify-center space-y-4 text-center">
                         <div className="relative w-32 h-32 flex items-center justify-center">
                             {/* Circular SVG Progress */}
                             <svg className="absolute inset-0 w-full h-full -rotate-90">
                                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                    className="text-cyan-500 transition-all duration-[2s] ease-out-expo"
                                    strokeDasharray="364"
                                    strokeDashoffset={364 - (364 * stats.avgConf) / 100}
                                    strokeLinecap="round"
                                 />
                             </svg>
                             <div className="text-center">
                                 <span className="text-3xl font-black text-white leading-none">{stats.avgConf}<span className="text-xs">%</span></span>
                                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Accuracy</p>
                             </div>
                         </div>
                         <div className="space-y-1">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Confidence</h4>
                             <p className="text-[9px] text-slate-500 leading-relaxed italic px-4">Automatic verification of all municipal hazards via cloud-based AI nodes.</p>
                         </div>
                    </div>
                </div>

                {/* Detailed Logs Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                            Telemetry Logs
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        </h3>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <span className="material-icons-round text-slate-500 text-sm">history</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 24 Hours</span>
                        </div>
                    </div>

                    {hazards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-10 glass-panel rounded-[40px] text-center space-y-4 bg-slate-950/40">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
                                <span className="material-icons-round text-3xl">inbox</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">No Active Hazards</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">Your personal telemetry stream is currently clear. Any reports you submit will appear here in real-time.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hazards.map((hazard, index) => (
                                <div 
                                    key={index} 
                                    className="group relative bg-slate-900/40 backdrop-blur-xl p-5 rounded-[32px] border border-white/5 shadow-2xl flex items-center gap-5 hover:bg-slate-900/70 transition-all hover:translate-y-[-4px] hover:border-white/10 duration-300" 
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    {/* Hazard Visual Element */}
                                    <div className="relative w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden shrink-0 border border-white/10 group-hover:border-blue-500/30 transition-all">
                                        <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay z-10"></div>
                                        {hazard.image ? (
                                            <img src={hazard.image} alt={hazard.type} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all scale-110 group-hover:scale-100" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                <span className="material-icons-round text-slate-600">satellite_alt</span>
                                            </div>
                                        )}
                                        {/* Corner Notch */}
                                        <div className="absolute top-0 left-0 w-4 h-4 bg-slate-900 -translate-x-1/2 -translate-y-1/2 rotate-45 z-20"></div>
                                    </div>

                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${hazard.resolved ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                                <h4 className={`text-sm font-black tracking-tight truncate ${hazard.resolved ? 'text-slate-500 decoration-slate-600/50' : 'text-white'}`}>
                                                    {hazard.type}
                                                </h4>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {hazard.resolved ? (
                                                    <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md font-black uppercase border border-green-500/20">Resolved</span>
                                                ) : (
                                                    <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md font-black uppercase border border-red-500/20">Active Internal Warning</span>
                                                )}
                                                <span className="text-[9px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-white/5">Local Node</span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-3 font-mono">
                                            <span className="material-icons-round text-[12px] text-slate-600">gps_fixed</span>
                                            {hazard.lat?.toFixed(5)}, {hazard.lng?.toFixed(5)}
                                        </p>
                                    </div>

                                    {/* Action Hub */}
                                    <div className="flex flex-col items-end gap-3">
                                        <button 
                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/30 flex items-center justify-center group/btn"
                                            title="Inspect Telemetry" 
                                            onClick={() => navigateTo('map')}
                                        >
                                            <span className="material-icons-round text-base group-hover/btn:translate-x-0.5 transition-transform">analytics</span>
                                        </button>
                                        
                                        {!hazard.resolved && hazard.id && (
                                            <button 
                                                className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider transition-all border border-green-500/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                                                onClick={async () => {
                                                    try {
                                                        const docRef = doc(db, 'hazards', hazard.id);
                                                        await updateDoc(docRef, { resolved: true });
                                                    } catch (error) {
                                                        console.error("Failed to mark resolved", error);
                                                    }
                                                }}
                                            >
                                                Fix Case
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Accent Line */}
            <div className="h-1.5 w-full bg-linear-to-r from-blue-600 via-cyan-400 to-transparent opacity-50 shrink-0"></div>
        </section>
    );
};

export default DashboardScreen;

