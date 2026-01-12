import React from 'react';

const Sidebar = ({ isOpen, toggleSidebar, navigateTo }) => {
    return (
        <>
            <div
                className={`absolute inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleSidebar}
            ></div>
            <nav
                className={`absolute top-0 left-0 bottom-0 w-[280px] bg-slate-900/95 backdrop-blur-xl border-r border-white/20 z-50 transition-transform duration-300 flex flex-col p-6 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/20">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-xl text-white">
                        U
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-bold text-white leading-tight">User</h4>
                        <p className="text-sm text-gray-400">user@example.com</p>
                    </div>
                </div>
                <ul className="flex-1 space-y-2">
                    <li onClick={() => { navigateTo('home'); toggleSidebar(); }} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="material-icons-round">home</span> <span className="font-semibold">Home</span>
                    </li>
                    <li onClick={() => { navigateTo('map'); toggleSidebar(); }} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="material-icons-round">map</span> <span className="font-semibold">Hazard Map</span>
                    </li>
                    <li onClick={() => { navigateTo('report'); toggleSidebar(); }} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="material-icons-round">add_a_photo</span> <span className="font-semibold">Report Hazard</span>
                    </li>
                    <li onClick={() => { navigateTo('dashboard'); toggleSidebar(); }} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="material-icons-round">dashboard</span> <span className="font-semibold">Hazard Dashboard</span>
                    </li>
                    <li onClick={toggleSidebar} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="material-icons-round">settings</span> <span className="font-semibold">Settings</span>
                    </li>
                </ul>
                <div className="pt-4 mt-auto border-t border-white/10">
                    <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-semibold">
                        <span className="material-icons-round">logout</span> Logout
                    </button>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
