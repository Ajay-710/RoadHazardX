import React, { useEffect, useRef, useState } from 'react';

const MapScreen = ({ isActive, toggleSidebar, currentUserLocation, hazards, onRouteRequest }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const userMarkerRef = useRef(null);
    const markersLayerRef = useRef(null);

    const [alertText, setAlertText] = useState('');
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [destination, setDestination] = useState('');

    // Initialize Map
    useEffect(() => {
        if (isActive && !mapInstanceRef.current && mapRef.current) {
            // Delay slightly for render 
            setTimeout(() => {
                if (!mapRef.current) return;

                const startLat = currentUserLocation ? currentUserLocation.lat : 12.9716;
                const startLng = currentUserLocation ? currentUserLocation.lng : 77.5946;

                const map = window.L.map(mapRef.current).setView([startLat, startLng], 15);

                window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                mapInstanceRef.current = map;

                // Initialize markers layer
                markersLayerRef.current = window.L.layerGroup().addTo(map);

                // Add initial hazards
                hazards.forEach(h => addHazardMarker(h.lat, h.lng, h.type, h.image));

                // Add user if exists
                if (currentUserLocation) {
                    updateUserMarker(currentUserLocation.lat, currentUserLocation.lng);
                }
            }, 100);
        } else if (isActive && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
        }
    }, [isActive]); // Run when screen becomes active

    // Watch location updates
    useEffect(() => {
        if (mapInstanceRef.current && currentUserLocation) {
            updateUserMarker(currentUserLocation.lat, currentUserLocation.lng);
        }
    }, [currentUserLocation]);

    // Watch hazard updates
    useEffect(() => {
        if (mapInstanceRef.current) {
            // Initialize layer group if not exists
            if (!markersLayerRef.current) {
                markersLayerRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
            }

            // Clear existing markers to prevent duplicates
            markersLayerRef.current.clearLayers();

            // Add all hazards
            hazards.forEach(h => addHazardMarker(h.lat, h.lng, h.type, h.image));
        }
    }, [hazards, isActive]); // Re-run when hazards change or screen becomes active

    const updateUserMarker = (lat, lng) => {
        if (!mapInstanceRef.current) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
            // mapInstanceRef.current.setView([lat, lng], 16); // Follow user? Maybe too aggressive
        } else {
            const userIcon = window.L.divIcon({
                className: 'user-marker-icon',
                html: '<div style="background-color: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            userMarkerRef.current = window.L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current);
            mapInstanceRef.current.setView([lat, lng], 16);
        }
    };

    const addHazardMarker = (lat, lng, type, image) => {
        if (!markersLayerRef.current) return;

        let marker;

        if (image) {
            // Custom Icon with Image
            const customIcon = window.L.divIcon({
                className: 'hazard-marker-custom',
                html: `<div style="
                    background-image: url('${image}');
                    width: 50px;
                    height: 50px;
                    background-size: cover;
                    background-position: center;
                    border-radius: 50%;
                    border: 3px solid #ff3b30;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            });
            marker = window.L.marker([lat, lng], { icon: customIcon });
        } else {
            // Standard Marker
            marker = window.L.marker([lat, lng]);
        }

        marker.on('click', () => {
            showAlert(type);
        });

        markersLayerRef.current.addLayer(marker);
    };

    const showAlert = (text) => {
        setAlertText(text);
        setTimeout(() => setAlertText(''), 4000);
    };

    const startNavigation = () => {
        if (!destination) {
            alert("Please enter a destination");
            return;
        }
        setShowRouteModal(false);

        // Mock Navigation logic
        if (mapInstanceRef.current && (userMarkerRef.current || currentUserLocation)) {
            const userLoc = userMarkerRef.current ? userMarkerRef.current.getLatLng() : currentUserLocation;
            const destLoc = [userLoc.lat + 0.005, userLoc.lng + 0.005];

            window.L.marker(destLoc).addTo(mapInstanceRef.current).bindPopup(destination).openPopup();
            window.L.polyline([userLoc, destLoc], { color: 'blue', weight: 4, dashArray: '10, 10' }).addTo(mapInstanceRef.current);

            showAlert(`Navigating to ${destination}`);
        }
    };

    if (!isActive) return null;

    return (
        <section className="absolute inset-0 flex flex-col bg-bg-gradient z-10">
            <div className="relative w-full h-full overflow-hidden bg-gray-200">
                <div id="map" ref={mapRef} className="z-0"></div>

                {/* Mock Map Header */}
                <div className="absolute top-4 left-4 right-4 flex gap-3 z-[1000] max-w-xl mx-auto">
                    <button className="bg-white text-gray-800 rounded-full w-11 h-11 flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors" onClick={toggleSidebar}>
                        <span className="material-icons-round">menu</span>
                    </button>
                    <div className="flex-1 bg-white text-gray-800 p-3 rounded-full flex items-center gap-2 shadow-md">
                        <span className="material-icons-round text-gray-500">search</span>
                        <span className="text-gray-500 text-sm">Search destination...</span>
                    </div>
                </div>

                {/* Hazard Alert Overlay */}
                <div
                    className={`absolute bottom-36 left-4 right-4 bg-red-500/90 text-white border-0 z-[1000] max-w-xl mx-auto rounded-xl p-4 shadow-lg animate-slide-up transform transition-all duration-300 ${alertText ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
                >
                    <div className="flex items-center gap-4">
                        <span className="material-icons-round text-3xl">warning</span>
                        <div>
                            <h3 className="font-bold">Hazard Ahead</h3>
                            <p className="text-sm">Drive Safe - {alertText} reported</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Modal */}
                {showRouteModal && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-md z-[2000] flex flex-col gap-4 bg-glass-100 backdrop-blur-xl border border-glass-200 p-6 rounded-2xl shadow-2xl animate-fade-in scale-in">
                        <h3 className="font-bold text-xl text-white">Where to go?</h3>
                        <div className="w-full">
                            <input
                                type="text"
                                placeholder="Enter destination..."
                                className="w-full p-4 rounded-xl border border-glass-200 bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-primary"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-2">
                            <button className="flex-1 p-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold transition-colors" onClick={() => setShowRouteModal(false)}>Cancel</button>
                            <button className="flex-1 p-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all" onClick={startNavigation}>Go</button>
                        </div>
                    </div>
                )}

                {/* Bottom Action */}
                <div className="absolute bottom-6 left-4 right-4 z-[1000] max-w-xl mx-auto">
                    <button
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                        onClick={() => setShowRouteModal(true)}
                    >
                        Get Safe Route
                    </button>
                </div>
            </div>
        </section>
    );
};

export default MapScreen;
