import React from 'react';
import { SignOutButton, useUser } from '@clerk/clerk-react';

const NAV_ITEMS = [
    { id: 'hero', icon: 'auto_awesome', label: 'Overview' },
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'report', icon: 'report', label: 'Report Hazard' },
    { id: 'map', icon: 'map', label: 'Smart Map' },
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'admin', icon: 'admin_panel_settings', label: 'Admin Panel' },
];

const Sidebar = ({ isOpen, toggleSidebar, navigateTo }) => {
    const { user, isLoaded } = useUser();

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
                {isLoaded && user && (
                    <div
                        className="mx-4 mb-4 p-3 rounded-xl flex items-center gap-3 flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {user.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt="avatar"
                                className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0"
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
                                {user.fullName || user.firstName || 'User'}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {user.primaryEmailAddress?.emailAddress || ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="mx-4 mb-3 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto px-3 space-y-1">
                    {NAV_ITEMS.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (id === 'admin') {
                                    // Secure redirection to the separate municipal command center
                                    const adminUrl = window.location.hostname === 'localhost' 
                                        ? 'http://localhost:5174' 
                                        : 'https://roadhazex-admin.web.app';
                                    window.open(adminUrl, '_blank');
                                } else {
                                    navigateTo(id);
                                    toggleSidebar();
                                }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200"
                            style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,107,107,0.12)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                            }}
                        >
                            <span className="material-icons-round text-xl" style={{ color: '#FF6B6B' }}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Divider */}
                <div className="mx-4 mt-3 mb-3 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* Sign Out */}
                <div className="px-3 pb-6 flex-shrink-0">
                    <SignOutButton>
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200"
                            style={{
                                fontWeight: 500,
                                color: 'rgba(255,107,107,0.85)',
                                background: 'rgba(255,107,107,0.08)',
                                border: '1px solid rgba(255,107,107,0.18)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,107,107,0.2)';
                                e.currentTarget.style.color = '#FF6B6B';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,107,107,0.08)';
                                e.currentTarget.style.color = 'rgba(255,107,107,0.85)';
                            }}
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            Sign Out
                        </button>
                    </SignOutButton>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
