import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import ReportScreen from './components/ReportScreen';
import MapScreen from './components/MapScreen';
import DashboardScreen from './components/DashboardScreen';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import LoginScreen from './components/LoginScreen';

function App() {
    const [currentScreen, setCurrentScreen] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    const [hazards, setHazards] = useState([
        { type: 'Potholes', lat: 12.972, lng: 77.595 },
        { type: 'Accident', lat: 12.974, lng: 77.592 }
    ]);

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

    const submitReport = (type, image) => {
        let lat = 12.9716, lng = 77.5946; // Default

        if (userLocation) {
            lat = userLocation.lat;
            lng = userLocation.lng;
        }

        const newHazard = { type, lat, lng, image };
        setHazards([...hazards, newHazard]);

        alert(`Report Submitted!\nType: ${type}\nLocation: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        navigateTo('map');
    };

    return (
        <main id="app">
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
