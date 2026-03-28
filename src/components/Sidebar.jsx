import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const NAV_ITEMS = [
    { id: 'hero', icon: 'auto_awesome', label: 'Overview' },
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'report', icon: 'report', label: 'Report Hazard' },
    { id: 'map', icon: 'map', label: 'Smart Map' },
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'admin', icon: 'admin_panel_settings', label: 'Admin Panel' },
];

const Sidebar = ({ isOpen, toggleSidebar, navigateTo }) => {
    const user = auth.currentUser;

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            console.log("🔥 Signed out from Firebase");
        } catch (error) {
            console.error("Sign out error:", error);
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                    onClick={toggleSidebar}
                />
            )}

            {/* Drawer */}
            <aside
                className="fixed top-0 left-0 h-full z-40 flex flex-col w-72 transition-transform duration-300 ease-in-out"
                style={{
                    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                    background: 'linear-gradient(160deg, #0d1b3e 0%, #1e3c72 100%)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isOpen ? '8px 0 40px rgba(0,0,0,0.5)' : 'none',
                }}
            >
                {/* Top accent */}
                <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg,#FF6B6B,#FF8E53)' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                        >
                            <span className="material-icons-round text-white text-lg">warning</span>
                        </div>
                        <span className="text-lg font-bold text-white tracking-wide">RoadHazardX</span>
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        <span className="material-icons-round text-xl">close</span>
                    </button>
                </div>

                {/* User info */}
                {user && (
                    <div
                        className="mx-4 mb-4 p-3 rounded-xl flex items-center gap-3 flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="avatar"
                                className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0 shadow-xl"
                                style={{ borderColor: 'rgba(255,107,107,0.5)' }}
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                            >
                                <span className="material-icons-round text-white text-xl">person</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {user.displayName || 'Anonymous User'}
                            </p>
                            <p className="text-xs truncate text-white/40">
                                {user.email || 'Cloud Node Active'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="mx-4 mb-3 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                    {NAV_ITEMS.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (id === 'admin') {
                                    window.open('https://roadhazex-admin.web.app', '_blank');
                                } else {
                                    navigateTo(id);
                                }
                            }}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group"
                            style={{
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.6)',
                            }}
                        >
                            <span className="material-icons-round text-xl transition-colors group-hover:text-white">{icon}</span>
                            <span className="text-sm font-medium transition-colors group-hover:text-white">{label}</span>
                        </button>
                    ))}
                </nav>

                {/* Sign out */}
                <div className="p-4 flex-shrink-0 border-t border-white/5">
                    <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-sm transition-all border border-orange-500/20"
                    >
                        <span className="material-icons-round text-lg">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
