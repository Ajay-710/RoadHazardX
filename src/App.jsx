import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import ReportScreen from './components/ReportScreen';
import MapScreen from './components/MapScreen';
import DashboardScreen from './components/DashboardScreen';
import LoginScreen from './components/LoginScreen';
import SuccessOverlay from './components/SuccessOverlay';

import { db, storage, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth'; 
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';


import HeroSection from './components/HeroSection';

function App() {
    const [currentScreen, setCurrentScreen] = useState('hero');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [user, setUser] = useState(null);
    const [isAuthLoaded, setIsAuthLoaded] = useState(false);
    const [currentUserLocation, setCurrentUserLocation] = useState(null);

    // Track User Location
    useEffect(() => {
        if (!navigator.geolocation) return;
        
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            (err) => console.warn("GPS Error:", err),
            { enableHighAccuracy: true }
        );
        
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setIsAuthLoaded(true);
            
            // Auto-navigate from hero to home if user logs in while on hero
            if (authUser && currentScreen === 'hero') {
                // We stay on hero but with auth, 
                // or we can auto-jump to home if they already logged in before.
                // However, user said "show animation first", so we keep 'hero' as default.
            }
        });
        return () => unsubscribe();
    }, [currentScreen]);

    const [hazards, setHazards] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'hazards'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHazards(data);
        });
        return () => unsubscribe();
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navigateTo = (screen) => {
        setCurrentScreen(screen);
        setIsSidebarOpen(false);
    };

    const submitReport = async (hazardData) => {
        if (!user) {
            setCurrentScreen('login');
            return;
        }

        setIsUploading(true);
        try {
            let imageUrl = '';
            if (hazardData.image) {
                const storagePath = `hazards/${Date.now()}.png`;
                const storageRef = ref(storage, storagePath);
                await uploadString(storageRef, hazardData.image, 'data_url');
                imageUrl = await getDownloadURL(storageRef);
            }

            const docData = {
                type: hazardData.type,
                lat: hazardData.lat,
                lng: hazardData.lng,
                image: imageUrl,
                confidence: hazardData.confidence || 0.85,
                timestamp: serverTimestamp(),
                userId: user.uid,
                reporterName: user.displayName || 'Anonymous',
                resolved: false
            };

            await addDoc(collection(db, 'hazards'), docData);
            setSuccessData(docData);
            setCurrentScreen('home');
        } catch (error) {
            console.error("Firebase submit error:", error);
            alert("Error reporting hazard: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isAuthLoaded) {
        return (
            <div className="fixed inset-0 bg-[#0d1b3e] flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Determine the active display
    const renderContent = () => {
        // 1. If we are on 'hero', always show hero (public)
        if (currentScreen === 'hero') {
            return (
                <HeroSection 
                    onGetStarted={() => {
                        if (user) navigateTo('home');
                        else navigateTo('login');
                    }} 
                    onMenuClick={toggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                />
            );
        }

        // 2. If user is NOT logged in and tries to access something else, show login
        if (!user || currentScreen === 'login') {
            return <LoginScreen onBack={() => navigateTo('hero')} />;
        }

        // 3. User is logged in, show requested screen
        return (
            <>
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={toggleSidebar} 
                    navigateTo={navigateTo} 
                />

                <main className="relative w-full h-full transition-transform duration-300">
                    <HomeScreen
                        isActive={currentScreen === 'home'}
                        navigateTo={navigateTo}
                        hazards={hazards}
                    />
                    <ReportScreen
                        isActive={currentScreen === 'report'}
                        navigateTo={navigateTo}
                        currentUserLocation={currentUserLocation}
                        onSubmit={(type, img, conf, status, addr) => {
                            submitReport({
                                type,
                                image: img,
                                lat: currentUserLocation?.lat,
                                lng: currentUserLocation?.lng,
                                confidence: conf,
                                status,
                                address: addr
                            });
                        }}
                        isUploading={isUploading}
                    />
                    <MapScreen
                        isActive={currentScreen === 'map'}
                        hazards={hazards}
                        toggleSidebar={toggleSidebar}
                    />
                    <DashboardScreen
                        isActive={currentScreen === 'dashboard'}
                        hazards={hazards}
                        navigateTo={navigateTo}
                    />
                </main>

                {successData && (
                    <SuccessOverlay 
                        data={successData} 
                        onClose={() => setSuccessData(null)} 
                    />
                )}
            </>
        );
    };

    return (
        <div className={`relative w-full ${currentScreen === 'hero' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-bg-gradient shadow-2xl`}>
            {renderContent()}
        </div>
    );
}

export default App;
