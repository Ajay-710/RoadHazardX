import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';



const STATUS_THEMES = {
    "Pending": { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", pill: "bg-red-500", glow: "shadow-[0_0_20px_rgba(239,68,68,0.4)]" },
    "Verified": { color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", pill: "bg-blue-500", glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]" },
    "In Progress": { color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", pill: "bg-amber-500", glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]" },
    "Resolved": { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", pill: "bg-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]" }
};

const getTheme = (status) => STATUS_THEMES[status] || STATUS_THEMES["Pending"];

const AdminDashboard = ({ hazards, userRole }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [selectedHazard, setSelectedHazard] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Priority Sorting Logic (Dynamic Leaderboard based on report counts) ---
    const processedHazards = useMemo(() => {
        return hazards.map(h => {
            const count = h.reportCount || 1;
            return {
                ...h,
                priorityRate: count,
                isCritical: count >= 5
            };
        }).sort((a, b) => b.priorityRate - a.priorityRate);
    }, [hazards]);

    const filteredHazards = processedHazards.filter(h => {
        const matchesStatus = filterStatus === 'All' || h.status === filterStatus;
        const matchesSearch = h.type?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    // --- Map Initialization ---
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
        
        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${OLA_MAPS_API_KEY}`,
            center: [77.5946, 12.9716],
            zoom: 12,
            transformRequest: (url) => {
                if (!url.includes('?')) url += `?api_key=${OLA_MAPS_API_KEY}`;
                else if (!url.includes('api_key')) url += `&api_key=${OLA_MAPS_API_KEY}`;
                return { url };
            }
        });

        return () => {
            if (mapRef.current) mapRef.current.remove();
        };
    }, []);

    useEffect(() => {
        if (mapRef.current) addMarkers();
    }, [filteredHazards]);

    const markersRef = useRef([]);

    const addMarkers = () => {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        filteredHazards.forEach(hazard => {
            const hLng = Number(hazard.lng);
            const hLat = Number(hazard.lat);
            if (isNaN(hLng) || isNaN(hLat)) return;

            const theme = getTheme(hazard.status);
            const el = document.createElement('div');
            el.className = `w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 shadow-lg transition-transform hover:scale-125 hover:z-50 ${theme.pill}`;
            
            if (hazard.isCritical && hazard.status === 'Pending') {
                el.innerHTML = `<div class="absolute inset-0 rounded-2xl animate-ping bg-red-500 opacity-40"></div>`;
            }
            
            const icon = document.createElement('span');
            icon.className = "material-icons-round text-white text-base";
            icon.innerText = hazard.isCritical ? "priority_high" : "warning";
            el.appendChild(icon);

            el.onclick = () => {
                setSelectedHazard(hazard);
                mapRef.current.flyTo({ center: [hLng, hLat], zoom: 16, duration: 1500 });
            };

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([hLng, hLat])
                .addTo(mapRef.current);
            
            markersRef.current.push(marker);
        });
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const docRef = doc(db, 'hazards', id);
            const updates = { status: newStatus, resolved: newStatus === 'Resolved' };
            await updateDoc(docRef, updates);
            setSelectedHazard(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#020617] relative min-h-0">
            {/* Command Header */}
            <header className="h-20 shrink-0 bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                        <span className="material-icons-round text-white text-2xl">monitoring</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase">Municipal Command</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Safety Infrastructure Live // Session Active</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                     <div className="flex flex-col items-end">
                          <div className="text-xs font-black text-white tracking-widest">{new Date().toLocaleTimeString()}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Time</div>
                     </div>
                     <div className="w-px h-10 bg-white/5"></div>
                     <div className="text-right">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authorization</div>
                          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase">{userRole || 'Unauthorized'}</div>
                     </div>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden relative min-h-0">
                {/* Left Panel: Analytics & List */}
                <aside className="w-[420px] h-full shrink-0 border-r border-white/5 bg-slate-950/50 flex flex-col z-20 min-h-0">
                    {/* Search & Stats */}
                    <div className="p-6 shrink-0 space-y-6 bg-slate-900/40 border-b border-white/5">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500 group-focus-within:text-blue-400 transition-colors">travel_explore</span>
                            <input 
                                type="text" 
                                placeholder="Search Municipal Records..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                                  <div className="text-3xl font-black text-red-500 tracking-tighter">{hazards.filter(h => !h.resolved).length}</div>
                                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-1">Pending Threats</p>
                             </div>
                             <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                  <div className="text-3xl font-black text-emerald-500 tracking-tighter">{hazards.filter(h => h.resolved).length}</div>
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">Resolved</p>
                             </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 py-1 custom-scrollbar">
                            {['All', 'Pending', 'Verified', 'In Progress', 'Resolved'].map(stat => (
                                <button 
                                    key={stat}
                                    onClick={() => setFilterStatus(stat)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border 
                                        ${filterStatus === stat 
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/20' 
                                            : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-200'}`}
                                >
                                    {stat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Infinite Hazard List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-2 custom-scrollbar overscroll-contain">
                         {filteredHazards.map((hazard) => {
                             const theme = getTheme(hazard.status);
                             return (
                                <div 
                                    key={hazard.id}
                                    onClick={() => {
                                        setSelectedHazard(hazard);
                                        mapRef.current.flyTo({ center: [hazard.lng, hazard.lat], zoom: 17, padding: { left: 420, right: 460 }, duration: 1500 });
                                    }}
                                    className={`group p-5 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden
                                        ${selectedHazard?.id === hazard.id 
                                            ? 'bg-slate-900 border-blue-500/50 shadow-2xl ring-1 ring-blue-500/20' 
                                            : 'bg-slate-950/20 border-white/5 hover:border-white/20'}`}
                                >
                                    {hazard.isCritical && hazard.status === 'Pending' && (
                                        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white ${theme.pill}`}>
                                            {hazard.status || 'Pending'}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                                            <span className="material-icons-round text-blue-400 text-xs">group</span>
                                            <span className="text-[10px] font-black text-slate-400">Rate: {hazard.priorityRate}</span>
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-base font-black text-slate-100 mb-1.5 uppercase tracking-tight truncate">{hazard.type}</h4>
                                    <div className="text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                                        <span className="material-icons-round text-base text-slate-600 shrink-0">location_on</span>
                                        <span className="line-clamp-2">{hazard.address || "Location Coordinate System"}</span>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                              <div className="flex -space-x-2">
                                                   {[...Array(Math.min(3, hazard.reportCount || 1))].map((_, i) => (
                                                       <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center">
                                                           <span className="material-icons-round text-[10px] text-slate-500">person</span>
                                                       </div>
                                                   ))}
                                              </div>
                                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                   {hazard.reportCount || 1} Reports
                                              </span>
                                         </div>
                                         <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Live Trace</span>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </aside>

                {/* Map Interface */}
                <main className="flex-1 relative bg-slate-950">
                    <div ref={mapContainerRef} className="absolute inset-0" />
                    
                    {/* Gradient Overlays for Cinematic Feel */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none"></div>

                    {/* Legend */}
                    <div className="absolute bottom-10 left-10 z-10 flex gap-4">
                         <div className="glass-panel p-4 rounded-3xl shadow-2xl flex items-center gap-8 px-8">
                             {['Pending', 'Verified', 'In Progress', 'Resolved'].map(s => (
                                 <div key={s} className="flex items-center gap-3">
                                     <span className={`w-3 h-3 rounded-full ${getTheme(s).pill} shadow-lg shadow-black/50`}></span>
                                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{s}</span>
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* Detail Floating Node */}
                    {selectedHazard && (
                        <div className="absolute top-10 right-10 w-[440px] max-h-[calc(100%-5rem)] bg-slate-950/90 backdrop-blur-3xl rounded-[48px] shadow-[0_40px_120px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden flex flex-col z-30 animate-slide-in-right">
                             <div className="relative h-72 shrink-0 overflow-hidden">
                                 <img src={selectedHazard.image} className="w-full h-full object-cover brightness-[0.7]" alt="Evidence" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                                 
                                 <button 
                                    onClick={() => setSelectedHazard(null)}
                                    className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/60 backdrop-blur-3xl text-white flex items-center justify-center hover:bg-black/90 transition-all border border-white/10 shadow-2xl"
                                 >
                                     <span className="material-icons-round">close</span>
                                 </button>

                                 <div className="absolute bottom-10 left-10 right-10">
                                     <div className={`px-3 py-1 rounded w-fit text-[10px] font-black text-white uppercase mb-4 tracking-widest ${getTheme(selectedHazard.status).pill}`}>
                                         {selectedHazard.status || 'Pending'}
                                     </div>
                                     <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter pr-4">{selectedHazard.type}</h2>
                                 </div>
                             </div>

                             <div className="p-10 flex-1 overflow-y-auto min-h-0 space-y-10 custom-scrollbar pr-6 overscroll-contain">
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="bg-white/5 p-6 rounded-[36px] border border-white/5 text-center transition-transform hover:scale-[1.02]">
                                         <div className="text-5xl font-black text-white tracking-tighter leading-none">{selectedHazard.reportCount || 1}</div>
                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">Reports Sync</p>
                                     </div>
                                     <div className="bg-blue-500/10 p-6 rounded-[36px] border border-blue-500/20 text-center transition-transform hover:scale-[1.02]">
                                         <div className="text-5xl font-black text-blue-400 tracking-tighter leading-none">{selectedHazard.priorityRate}</div>
                                         <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-3">Priority Rate</p>
                                     </div>
                                 </div>

                                 <div className="space-y-8">
                                     <div className="flex items-start gap-6">
                                          <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/5">
                                              <span className="material-icons-round text-2xl">location_city</span>
                                          </div>
                                          <div>
                                              <p className="text-sm font-black text-slate-100 leading-snug tracking-tight mb-2 underline decoration-blue-500/50 underline-offset-4 decoration-2">{selectedHazard.address || "Municipal Jurisdiction"}</p>
                                              <p className="text-[11px] font-mono font-black text-slate-600 tracking-widest uppercase flex items-center gap-2">
                                                   <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                                    GPS: {selectedHazard.lat?.toFixed(5)}N / {selectedHazard.lng?.toFixed(5)}E
                                              </p>
                                          </div>
                                     </div>

                                     <div className="p-6 rounded-[36px] bg-slate-900/60 border border-white/5 flex items-center justify-between shadow-inner">
                                         <div className="flex items-center gap-3">
                                              <span className="material-icons-round text-blue-500 text-xl">verified</span>
                                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">AI Validation</span>
                                         </div>
                                         <div className={`px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase
                                            ${selectedHazard.verification_status === 'Verified' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                                              {selectedHazard.verification_status || 'Pending'}
                                         </div>
                                     </div>
                                 </div>

                                 <div className="pt-8 border-t border-white/5">
                                     <div className="flex items-center justify-between mb-8">
                                          <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Lifecycle Management</h5>
                                          <span className="material-icons-round text-slate-700 cursor-help">info_outline</span>
                                     </div>
                                     <div className="grid grid-cols-1 gap-3">
                                         {['Pending', 'In Progress', 'Resolved'].map(s => (
                                             <button 
                                                key={s}
                                                onClick={() => handleStatusUpdate(selectedHazard.id, s)}
                                                className={`group w-full py-5 rounded-[24px] text-xs font-black transition-all border flex items-center justify-between px-8
                                                    ${selectedHazard.status === s 
                                                        ? 'bg-white text-slate-950 border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-[1.03]' 
                                                        : 'bg-slate-900 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'}`}
                                             >
                                                 {s.toUpperCase()}
                                                 <span className={`material-icons-round transition-all ${selectedHazard.status === s ? 'text-slate-950 opacity-100' : 'opacity-0 group-hover:opacity-40 animate-pulse'}`}>
                                                     {s === 'Resolved' ? 'done_all' : 'sync'}
                                                 </span>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
