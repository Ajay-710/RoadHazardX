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
import * as turf from '@turf/turf';

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

        // Show instant success message and redirect to map immediately
        setSuccessData(hazardData);
        setCurrentScreen('map');
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
                address: hazardData.address || "Unknown Location",
                image: imageUrl,
                confidence: hazardData.confidence || 0.85,
                timestamp: serverTimestamp(),
                userId: user.uid,
                reporterName: user.displayName || 'Anonymous',
                reportCount: 1,
                status: hazardData.status || 'Pending',
                verification_status: hazardData.status === 'Verified' ? 'Verified' : 'Pending',
                resolved: false,
                isCritical: false
            };

            await addDoc(collection(db, 'hazards'), docData);
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

    const renderContent = () => {
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

        if (!user || currentScreen === 'login') {
            return <LoginScreen onBack={() => navigateTo('hero')} />;
        }

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
                        navigateTo={navigateTo}
                        currentUserLocation={currentUserLocation}
                    />
                    <DashboardScreen
                        isActive={currentScreen === 'dashboard'}
                        hazards={hazards}
                        navigateTo={navigateTo}
                        currentUser={user}
                        toggleSidebar={toggleSidebar}
                    />
                </main>

                <SuccessOverlay 
                    visible={!!successData} 
                    hazardData={successData} 
                    onDone={() => setSuccessData(null)} 
                />
            </>
        );
    };

    return (
        <div className={`relative w-full ${currentScreen === 'hero' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-[#020617] shadow-2xl`}>
            {renderContent()}
        </div>
    );
}

export default App;
