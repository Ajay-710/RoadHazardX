"use client";

import React, { useState } from "react";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  Dashboard,
  Task,
  Map,
  Security,
  Report,
  Analytics,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown as ChevronDownIcon,
  AddLarge,
  View,
  Logout
} from "@carbon/icons-react";

/** ======================= Local SVG paths (inline) ======================= */
const svgPaths = {
  p10dcabc0: "M8 11L3 6.00001L3.7 5.30001L8 9.60001L12.3 5.30001L13 6.00001L8 11Z",
  p36880f80:
    "M0.32 0C0.20799 0 0.151984 0 0.109202 0.0217987C0.0715695 0.0409734 0.0409734 0.0715695 0.0217987 0.109202C0 0.151984 0 0.20799 0 0.32V6.68C0 6.79201 0 6.84801 0.0217987 6.8908C0.0409734 6.92843 0.0715695 6.95902 0.109202 6.9782C0.151984 7 0.207989 7 0.32 7L3.68 7C3.79201 7 3.84802 7 3.8908 6.9782C3.92843 6.95903 3.95903 6.92843 3.9782 6.8908C4 6.84801 4 6.79201 4 6.68V4.32C4 4.20799 4 4.15198 4.0218 4.1092C4.04097 4.07157 4.07157 4.04097 4.1092 4.0218C4.15198 4 4.20799 4 4.32 4L19.68 4C19.792 4 19.848 4 19.8908 4.0218C19.9284 4.04097 19.959 4.07157 19.9782 4.1092C20 4.15198 20 4.20799 20 4.32V6.68C20 6.79201 20 6.84802 20.0218 6.8908C20.041 6.92843 20.0716 6.95903 20.1092 6.9782C20.152 7 20.208 7 20.32 7L23.68 7C23.792 7 23.848 7 23.8908 6.9782C23.9284 6.95903 23.959 6.92843 23.9782 6.8908C24 6.84802 24 6.79201 24 6.68V0.32C24 0.20799 24 0.151984 23.9782 0.109202C23.959 0.0715695 23.9284 0.0409734 23.8908 0.0217987C23.848 0 23.792 0 23.68 0H0.32Z",
  p355df480:
    "M0.32 16C0.20799 16 0.151984 16 0.109202 15.9782C0.0715695 15.959 0.0409734 15.9284 0.0217987 15.8908C0 15.848 0 15.792 0 15.68V9.32C0 9.20799 0 9.15198 0.0217987 9.1092C0.0409734 9.07157 0.0715695 9.04097 0.109202 9.0218C0.151984 9 0.207989 9 0.32 9H3.68C3.79201 9 3.84802 9 3.8908 9.0218C3.92843 9.04097 3.95903 9.07157 3.9782 9.1092C4 9.15198 4 9.20799 4 9.32V11.68C4 11.792 4 11.848 4.0218 11.8908C4.04097 11.9284 4.07157 11.959 4.1092 11.9782C4.15198 12 4.20799 12 4.32 12L19.68 12C19.792 12 19.848 12 19.8908 11.9782C19.9284 11.959 19.959 11.9284 19.9782 11.8908C20 11.848 20 11.792 20 11.68V9.32C20 9.20799 20 9.15199 20.0218 9.1092C20.041 9.07157 20.0716 9.04098 20.1092 9.0218C20.152 9 20.208 9 20.32 9H23.68C23.792 9 23.848 9 23.8908 9.0218C23.9284 9.04098 23.959 9.07157 23.9782 9.1092C24 9.15199 24 9.20799 24 9.32V15.68C24 15.792 24 15.848 23.9782 15.8908C23.959 15.9284 23.9284 15.959 23.8908 15.9782C23.848 16 23.792 16 23.68 16H0.32Z",
  pfa0d600:
    "M6.32 10C6.20799 10 6.15198 10 6.1092 9.9782C6.07157 9.95903 6.04097 9.92843 6.0218 9.8908C6 9.84802 6 9.79201 6 9.68B6.32C6 6.20799 6 6.15198 6.0218 6.1092C6.04097 6.07157 6.07157 6.04097 6.1092 6.0218C6.15198 6 6.20799 6 6.32 6L17.68 6C17.792 6 17.848 6 17.8908 6.0218C17.9284 6.04097 17.959 6.07157 17.9782 6.1092C18 6.15198 18 6.20799 18 6.32V9.68C18 9.79201 18 9.84802 17.9782 9.8908C17.959 9.92843 17.9284 9.95903 17.8908 9.9782C17.848 10 17.792 10 17.68 10H6.32Z",
};

const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

function InterfacesLogoSquare() {
  return (
    <div className="aspect-[24/24] grow min-h-px min-w-px overflow-clip relative shrink-0">
      <div className="absolute aspect-[24/16] left-0 right-0 top-1/2 -translate-y-1/2">
        <svg className="block size-full" fill="none" viewBox="0 0 24 16">
          <g>
            <path d={svgPaths.p36880f80} fill="#FF6B6B" />
            <path d={svgPaths.p355df480} fill="#FF8E53" />
            <path d={svgPaths.pfa0d600} fill="#FAFAFA" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function BrandBadge() {
  return (
    <div className="relative shrink-0 w-full animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center p-1 w-full">
        <div className="h-10 w-8 flex items-center justify-center pl-2">
          <InterfacesLogoSquare />
        </div>
        <div className="px-2 py-1">
          <div className="font-bold text-[16px] text-neutral-50 tracking-tight">
            RoadHazardX
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarCircle() {
  const user = auth.currentUser;
  return (
    <div className="relative rounded-full shrink-0 size-8 bg-neutral-900 border border-neutral-800 shadow-lg">
      <div className="flex items-center justify-center size-8 overflow-hidden rounded-full font-bold">
        {user?.photoURL ? (
            <img src={user.photoURL} alt="P" className="size-full object-cover" />
        ) : (
            <UserIcon size={16} className="text-neutral-50" />
        )}
      </div>
    </div>
  );
}

function IconNavButton({
  children,
  isActive = false,
  onClick,
  label,
}) {
  return (
    <button
      type="button"
      title={label}
      className={`flex items-center justify-center rounded-xl size-10 min-w-10 transition-all duration-300
        ${isActive ? "bg-neutral-800 text-white shadow-xl scale-110" : "hover:bg-neutral-800/50 text-neutral-500 hover:text-neutral-200"}`}
      style={{ transitionTimingFunction: softSpringEasing }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MenuItem({
  item,
  isExpanded,
  onToggle,
  onItemClick,
  isCollapsed,
  currentScreen
}) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) onToggle();
    else onItemClick?.();
  };

  return (
    <div className={`relative shrink-0 transition-all duration-500 ${isCollapsed ? "w-full flex justify-center" : "w-full"}`}>
      <div
        className={`rounded-xl cursor-pointer transition-all duration-300 flex items-center relative ${
          (item.isActive || item.id === currentScreen) ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "hover:bg-neutral-800/50 text-neutral-400 hover:text-white"
        } ${isCollapsed ? "w-10 min-w-10 h-10 justify-center" : "w-full h-11 px-3 py-2"}`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-center shrink-0">{item.icon}</div>
        <div className={`flex-1 relative transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3"}`}>
          <div className="text-[14px] font-medium leading-[20px] truncate">
            {item.label}
          </div>
        </div>
        {(item.isActive || item.id === currentScreen) && !isCollapsed && (
            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_#FF6B6B]" />
        )}
        {item.hasDropdown && (
          <div className={`flex items-center justify-center shrink-0 transition-opacity duration-500 ${isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-2"}`}>
            <ChevronDownIcon size={16} className={`transition-transform duration-500 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
          </div>
        )}
      </div>
    </div>
  );
}

const Sidebar = ({ isOpen, toggleSidebar, navigateTo, currentScreen }) => {
  const [activeRail, setActiveRail] = useState("app");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.currentUser;

  React.useEffect(() => {
    if (['hero', 'home', 'report', 'map'].includes(currentScreen)) {
        setActiveRail('app');
    } else if (['dashboard'].includes(currentScreen)) {
        setActiveRail('analytics');
    } else if (['admin'].includes(currentScreen)) {
        setActiveRail('system');
    }
  }, [currentScreen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toggleSidebar();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const contentMap = {
    app: {
      title: "Navigation",
      sections: [
        {
          title: "Main Views",
          items: [
            { icon: <View size={16} />, label: "Overview", id: 'hero' },
            { icon: <Dashboard size={16} />, label: "Home", id: 'home' },
          ],
        },
        {
          title: "Safety Actions",
          items: [
            { icon: <Report size={16} />, label: "Report Hazard", id: 'report' },
            { icon: <Map size={16} />, label: "Smart Map", id: 'map' },
          ],
        },
      ],
    },
    analytics: {
      title: "Analytics",
      sections: [
        {
          title: "Data Insights",
          items: [
            { icon: <Analytics size={16} />, label: "My Dashboard", id: 'dashboard' },
            { 
              icon: <Task size={16} />, 
              label: "Recent Reports", 
              hasDropdown: true,
              children: [
                { label: "Pothole nearby" },
                { label: "Construction" }
              ]
            },
          ],
        },
      ],
    },
    system: {
      title: "System",
      sections: [
        {
          title: "Administration",
          items: [
            { icon: <Security size={16} />, label: "Admin Panel", id: 'admin' },
          ],
        },
      ],
    },
  };

  const activeContent = contentMap[activeRail] || contentMap.app;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Layout */}
      <div
        className="fixed top-0 left-0 h-full z-[70] flex transition-all duration-500 ease-[cubic-bezier(0.25, 1.1, 0.4, 1)]"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Nav Rail (Left) */}
        <aside className="bg-[#0A0A0A] flex flex-col gap-3 items-center p-3 w-16 border-r border-neutral-800/50">
          <div className="mb-4 size-10 flex items-center justify-center p-1 bg-neutral-900 rounded-xl shadow-inner">
            <InterfacesLogoSquare />
          </div>

          <IconNavButton isActive={activeRail === "app"} onClick={() => setActiveRail("app")} label="Application">
            <Dashboard size={20} />
          </IconNavButton>
          <IconNavButton isActive={activeRail === "analytics"} onClick={() => setActiveRail("analytics")} label="Insights">
            <Analytics size={20} />
          </IconNavButton>
          <IconNavButton isActive={activeRail === "system"} onClick={() => setActiveRail("system")} label="System">
            <SettingsIcon size={20} />
          </IconNavButton>

          <div className="flex-1" />

          <IconNavButton onClick={handleSignOut} label="Log Out">
            <Logout size={20} className="text-orange-500" />
          </IconNavButton>
          
          <div className="size-8 mt-2">
            <AvatarCircle />
          </div>
        </aside>

        {/* Detail Sidebar (Right) */}
        <aside
          className={`bg-[#050505] flex flex-col gap-4 items-start p-4 transition-all duration-500 ${
            isCollapsed ? "w-16" : "w-64"
          } border-r border-neutral-800/30 shadow-2xl`}
        >
          {!isCollapsed && <BrandBadge />}

          <div className="w-full flex items-center justify-between mt-2">
            {!isCollapsed && <span className="text-sm font-bold text-neutral-400 px-1 uppercase tracking-widest text-[10px]">{activeContent.title}</span>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-500 transition-all active:scale-90"
            >
              <ChevronDownIcon size={16} className={isCollapsed ? "-rotate-90" : "rotate-90"} />
            </button>
          </div>

          <div className="flex flex-col w-full gap-6 overflow-y-auto no-scrollbar">
            {activeContent.sections.map((section, idx) => (
              <div key={idx} className="flex flex-col w-full">
                {!isCollapsed && (
                  <div className="px-3 mb-2">
                    <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{section.title}</span>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item, i) => (
                    <MenuItem
                      key={i}
                      item={item}
                      isCollapsed={isCollapsed}
                      currentScreen={currentScreen}
                      onItemClick={() => {
                        if (item.id === 'admin') {
                          window.open('https://roadhazex-admin.web.app', '_blank');
                        } else {
                          navigateTo(item.id);
                          // toggleSidebar(); // Optional: close sidebar on click?
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!isCollapsed && (
            <div className="mt-auto w-full pt-4 border-t border-neutral-800/50">
              <div className="flex items-center gap-3 px-2">
                <AvatarCircle />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Active User'}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{user?.email || 'RoadHazeX Node'}</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
