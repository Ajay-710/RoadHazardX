import React from 'react';

const DashboardScreen = ({ isActive, navigateTo, hazards }) => {
    if (!isActive) return null;

    const stats = {
        total: hazards.length,
        active: hazards.length, // Mocking all as active for now
        resolved: 0
    };

    return (
        <section className="absolute inset-0 flex flex-col bg-bg-gradient z-10 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        onClick={() => navigateTo('home')}
                    >
                        <span className="material-icons-round text-white">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-white">Hazard Dashboard</h2>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-sm font-medium">Live Updates</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 px-6 mb-6">
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-white">{stats.total}</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">Total</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-red-500">
                    <span className="text-3xl font-bold text-white">{stats.active}</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">Active</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-green-500">
                    <span className="text-3xl font-bold text-white">{stats.resolved}</span>
                    <span className="text-xs text-gray-300 uppercase tracking-wider">Resolved</span>
                </div>
            </div>

            {/* Hazards List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 sticky top-0 bg-transparent backdrop-blur-md py-2 z-10">Recent Reports</h3>

                {hazards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <span className="material-icons-round text-4xl mb-2">check_circle</span>
                        <p>No hazards reported yet.</p>
                    </div>
                ) : (
                    hazards.map((hazard, index) => (
                        <div key={index} className="glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10">
                                {hazard.image ? (
                                    <img src={hazard.image} alt={hazard.type} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-icons-round text-gray-500">image_not_supported</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-white truncate">{hazard.type}</h4>
                                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-500/30">
                                        High Priority
                                    </span>
                                </div>
                                <p className="text-xs text-gray-300 flex items-center gap-1">
                                    <span className="material-icons-round text-[12px]">location_on</span>
                                    {hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Reported just now
                                </p>
                            </div>

                            <button className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-gray-300 hover:text-white transition-colors" title="View on Map">
                                <span className="material-icons-round">chevron_right</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

export default DashboardScreen;
