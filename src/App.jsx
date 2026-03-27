import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import ReportScreen from './components/ReportScreen';
import MapScreen from './components/MapScreen';
import DashboardScreen from './components/DashboardScreen';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import LoginScreen from './components/LoginScreen';
import SuccessOverlay from './components/SuccessOverlay';

import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

function App() {
    const [currentScreen, setCurrentScreen] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [hazards, setHazards] = useState([]);

    useEffect(() => {
        // Fetch hazards from Firestore in real-time
        const q = query(collection(db, "hazards"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const hazardList = [];
            snapshot.forEach((doc) => {
                hazardList.push({ id: doc.id, ...doc.data() });
            });
            setHazards(hazardList);
        }, (error) => {
            console.error("Firebase fetch error:", error);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Watch location
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                },
                (error) => {
                    console.error("Location error:", error);
                },
                { enableHighAccuracy: true }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const navigateTo = (screenId) => {
        setCurrentScreen(screenId);
        setIsSidebarOpen(false); // Close sidebar on nav
    };

    const submitReport = async (type, imageBase64, confidence = 1.0, verificationStatus = 'Pending', address = 'Unknown Location') => {
        let lat = 12.9716, lng = 77.5946; // Default

        if (userLocation) {
            lat = userLocation.lat;
            lng = userLocation.lng;
        }

        setIsUploading(true);

        try {
            // 1. Upload Base64 image to Firebase Storage
            const filename = `hazards/${Date.now()}.png`;
            const storageRef = ref(storage, filename);
            const uploadTask = uploadString(storageRef, imageBase64, 'data_url');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Firebase Storage Upload Timeout")), 15000)
            );

            await Promise.race([uploadTask, timeoutPromise]);
            const imageUrl = await getDownloadURL(storageRef);

            // 2. Snap to Road Precision
            const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
            let snappedLoc = { lat, lng };
            try {
                const snapRes = await fetch(`https://api.olamaps.io/routing/v1/snapToRoad?points=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
                const snapData = await snapRes.json();
                if (snapData.snapped_points?.[0]) {
                    snappedLoc = snapData.snapped_points[0].location;
                }
            } catch (err) {
                console.warn("SnapToRoad failed:", err);
            }

            // 3. Duplicate Detection Logic (50m radius)
            let duplicateDoc = null;
            const now = new Date();
            
            // Search existing hazards of the same type
            hazards.forEach(h => {
                if (h.type === type && !h.resolved) {
                    const from = turf.point([snappedLoc.lng, snappedLoc.lat]);
                    const to = turf.point([h.lng, h.lat]);
                    const distance = turf.distance(from, to, { units: 'kilometers' });
                    
                    if (distance <= 0.05) { // 50 meters
                        duplicateDoc = h;
                    }
                }
            });

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
                    confidence: confidence || 1.0
                };
                
                await addDoc(collection(db, "hazards"), newHazard);
                setSuccessData({ ...newHazard, image: imageBase64 });
            }
        } catch (error) {
            console.error("Firebase submit error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSuccessDone = () => {
        setSuccessData(null);
        navigateTo('map');
    };

    return (
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
                <LoginScreen />
            </SignedOut>
            <SignedIn>
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
                    hazards={hazards}
                />

                <DashboardScreen
                    isActive={currentScreen === 'dashboard'}
                    navigateTo={navigateTo}
                    hazards={hazards}
                />
            </SignedIn>
        </main>
    );
}

export default App;
