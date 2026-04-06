import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import ReportScreen from './components/ReportScreen';
import MapScreen from './components/MapScreen';
import DashboardScreen from './components/DashboardScreen';
<<<<<<< HEAD
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import LoginScreen from './components/LoginScreen';
import SuccessOverlay from './components/SuccessOverlay';

import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
=======
import LoginScreen from './components/LoginScreen';
import SuccessOverlay from './components/SuccessOverlay';

import { db, storage, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth'; 
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
>>>>>>> 65b72dc6ef6c1ab45332d956d099c6ff98f620da
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
            
            // Auto-navigate from hero to home if user logs in while on hero
            if (authUser && currentScreen === 'hero') {
                // We stay on hero but with auth, 
                // or we can auto-jump to home if they already logged in before.
                // However, user said "show animation first", so we keep 'hero' as default.
            }
        });
        return () => unsubscribe();
    }, [currentScreen]);

    const { user } = useUser();

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

<<<<<<< HEAD
            if (duplicateDoc && duplicateDoc.id) {
                // Update existing hazard
                const docRef = doc(db, "hazards", duplicateDoc.id);
                const updatedHazard = {
                    reportCount: (duplicateDoc.reportCount || 1) + 1,
                    lastReported: serverTimestamp(),
                    verification_status: verificationStatus,
                    // If current status is resolved but new report comes in, reactivate it? 
                    // Usually we don't merge into resolved ones (filtered above)
                };
                await updateDoc(docRef, updatedHazard);
                console.log("🔄 Duplicate detected. Incremented report count for:", duplicateDoc.id);
                setSuccessData({ ...duplicateDoc, ...updatedHazard, image: imageBase64 });
            } else {
                // Create new hazard
                const newHazard = {
                    type,
                    lat: snappedLoc.lat,
                    lng: snappedLoc.lng,
                    address: address, // From reverse geocoding
                    image: imageUrl,
                    reportCount: 1,
                    status: 'Pending', // Initial municipal status
                    verification_status: verificationStatus,
                    resolved: false,
                    timestamp: serverTimestamp(),
                    lastReported: serverTimestamp(),
                    confidence: confidence || 1.0,
                    user_id: user?.id || 'anonymous'
                };
                
                await addDoc(collection(db, "hazards"), newHazard);
                setSuccessData({ ...newHazard, image: imageBase64 });
            }
=======
            await addDoc(collection(db, 'hazards'), docData);
            setSuccessData(docData);
            setCurrentScreen('home');
>>>>>>> 65b72dc6ef6c1ab45332d956d099c6ff98f620da
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
                        navigateTo={navigateTo}
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
<<<<<<< HEAD
        <main id="app">
            <SuccessOverlay visible={!!successData} hazardData={successData} onDone={handleSuccessDone} />
            
            {/* Global Uploading Overlay */}
            {isUploading && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '60px', height: '60px', border: '5px solid rgba(255,255,255,0.1)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'white', marginTop: '1.5rem', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.05em' }}>Syncing Hazard to Cloud...</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.85rem' }}>Uploading Image & GeoData</span>
                </div>
            )}

            <SignedOut>
                {currentScreen === 'hero' ? (
                    <HeroSection onGetStarted={() => navigateTo('login')} />
                ) : (
                    <LoginScreen onBack={() => navigateTo('hero')} />
                )}
            </SignedOut>
            <SignedIn>
                {currentScreen === 'hero' ? (
                    <HeroSection onGetStarted={() => navigateTo('home')} />
                ) : (
                    <>
                        <Sidebar
                            isOpen={isSidebarOpen}
                            toggleSidebar={toggleSidebar}
                            navigateTo={navigateTo}
                        />

                        <HomeScreen
                            isActive={currentScreen === 'home'}
                            toggleSidebar={toggleSidebar}
                            navigateTo={navigateTo}
                        />

                        <ReportScreen
                            isActive={currentScreen === 'report'}
                            navigateTo={navigateTo}
                            currentUserLocation={userLocation}
                            onSubmit={submitReport}
                        />

                        <MapScreen
                            isActive={currentScreen === 'map'}
                            toggleSidebar={toggleSidebar}
                            currentUserLocation={userLocation}
                            hazards={hazards.filter(h => !h.resolved)}
                        />

                        <DashboardScreen
                            isActive={currentScreen === 'dashboard'}
                            navigateTo={navigateTo}
                            hazards={hazards}
                            currentUser={user}
                        />
                    </>
                )}
            </SignedIn>
        </main>
=======
        <div className={`relative w-full ${currentScreen === 'hero' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-bg-gradient shadow-2xl`}>
            {renderContent()}
        </div>
>>>>>>> 65b72dc6ef6c1ab45332d956d099c6ff98f620da
    );
}

export default App;
