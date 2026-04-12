import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import polyline from '@mapbox/polyline';
import * as turf from '@turf/turf';

const MapScreen = ({ isActive, toggleSidebar, currentUserLocation, hazards, onRouteRequest, navigateTo }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const userMarkerRef = useRef(null);
    const markersRef = useRef([]);

    const [alertText, setAlertText] = useState('');
    
    // UI states
    const [sourceQuery, setSourceQuery] = useState('');
    const [sourceResults, setSourceResults] = useState([]);
    const [isSearchingSource, setIsSearchingSource] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);

    const [showNearbySearch, setShowNearbySearch] = React.useState(false);
    const [nearbyType, setNearbyType] = React.useState('hospital');
    const [isSearchingNearby, setIsSearchingNearby] = React.useState(false);
    const [nearbyResults, setNearbyResults] = React.useState([]);
    const [rankBy, setRankBy] = React.useState('popular'); // popular, distance
    
    // Phase 22 & 23: Search & Validation
    const [textSearchResults, setTextSearchResults] = React.useState([]);
    const [isSearchingText, setIsSearchingText] = React.useState(false);
    const [isValidating, setIsValidating] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState(null);

    // Phase 24 & 25: Geocoding
    const [clickedLocation, setClickedLocation] = React.useState(null); // { lat, lng, address }
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const [geocodingResults, setGeocodingResults] = React.useState([]);

    // Phase 26: Geofencing & Safety Alerts
    const [activeGeofences, setActiveGeofences] = React.useState([]);
    const [isInsideGeofence, setIsInsideGeofence] = React.useState(false);
    const [currentGeofenceId, setCurrentGeofenceId] = React.useState(null);
    const [lastAlertTime, setLastAlertTime] = React.useState(0);
    // Phase 27: Elevation & Terrain
    const [currentElevation, setCurrentElevation] = React.useState(null);
    const [routeElevationProfile, setRouteElevationProfile] = React.useState(null);

    // Phase 19: Safety Dashboard & Alerts
    const [liveSafetyScore, setLiveSafetyScore] = React.useState(100); // 100 = Perfect, 0 = High Risk
    const [journeyRiskLogs, setJourneyRiskLogs] = React.useState([]);
    const [isVoiceEnabled, setIsVoiceEnabled] = React.useState(true);
    const [lastSpokenAlert, setLastSpokenAlert] = React.useState("");


    // Phase 13: Roads API States
    const [currentSpeedLimit, setCurrentSpeedLimit] = React.useState(null);
    const [breadcrumbs, setBreadcrumbs] = React.useState([]); // For path refinement
    const [selectedDestination, setSelectedDestination] = useState(null);

    const [destQuery, setDestQuery] = useState('');
    const [destResults, setDestResults] = useState([]);
    const [isSearchingDest, setIsSearchingDest] = useState(false);

    const [waypointQuery, setWaypointQuery] = useState('');
    const [waypointResults, setWaypointResults] = useState([]);
    const [isSearchingWaypoint, setIsSearchingWaypoint] = useState(false);
    const [selectedWaypoint, setSelectedWaypoint] = useState(null);
    const [showWaypointField, setShowWaypointField] = useState(false);
    
    // Navigation Features
    const [isNavigating, setIsNavigating] = useState(false);
    const [travelMode, setTravelMode] = useState('driving'); // driving, walking, bike, auto
    const [routingLanguage, setRoutingLanguage] = useState('en'); // en, ta
    const [routePreference, setRoutePreference] = useState('fastest'); // fastest, shortest
    const [routeStats, setRouteStats] = useState(null); // { distance, duration }
    const [is3D, setIs3D] = useState(false);
    const [showNearbyMenu, setShowNearbyMenu] = useState(false);
    
    // Phase 14: Personalization & Layers
    const [recentSearches, setRecentSearches] = useState(() => JSON.parse(localStorage.getItem('roadhazex_recent_searches') || '[]'));
    
    // Phase 29 & 30: Static Map URL Generator
    const generateStaticMapUrl = (lat, lng, zoom = 15, width = 600, height = 400) => {
        const style = mapStyle === 'dark' ? 'default-dark-standard' : 'default-light-standard';
        const marker = `${lng},${lat}|red|scale:0.8`;
        return `https://api.olamaps.io/tiles/v1/styles/${style}/static/${lng},${lat},${zoom}/${width}x${height}.png?api_key=${OLA_MAPS_API_KEY}&marker=${encodeURIComponent(marker)}`;
    };

    const generateComparisonPreviewUrl = (destLat, destLng, width = 800, height = 320) => {
        if (!currentUserLocation || !destLat || !destLng) {
            return `https://api.olamaps.io/tiles/v1/styles/default-light-standard/static/${destLng || 77.5946},${destLat || 12.9716},15/${width}x${height}.png?api_key=${OLA_MAPS_API_KEY}`;
        }
        
        let style = 'default-light-standard';
        if (mapStyle?.toLowerCase().includes('dark')) style = 'default-dark-standard';
        
        const startMarker = `${currentUserLocation.lng},${currentUserLocation.lat}|green`;
        const endMarker = `${destLng},${destLat}|red`;
        
        return `https://api.olamaps.io/tiles/v1/styles/${style}/static/auto/${width}x${height}.png?api_key=${OLA_MAPS_API_KEY}&marker=${encodeURIComponent(startMarker)}&marker=${encodeURIComponent(endMarker)}`;
    };

    const generateRouteSnapshotUrl = (coords, width = 800, height = 600) => {
        const style = mapStyle === 'dark' ? 'default-dark-standard' : 'default-light-standard';
        const step = Math.max(1, Math.floor(coords.length / 50));
        const sampled = coords.filter((_, i) => i % step === 0);
        const pathLine = sampled.map(c => `${c[0]},${c[1]}`).join('|');
        const startMarker = `${coords[0][0]},${coords[0][1]}|green|scale:0.6`;
        const endMarker = `${coords[coords.length-1][0]},${coords[coords.length-1][1]}|red|scale:0.6`;
        
        // Phase 30: Enhanced Path with width/stroke
        const pathParams = `width:5|stroke:%233b82f6|${pathLine}`;
        return `https://api.olamaps.io/tiles/v1/styles/${style}/static/auto/${width}x${height}.png?api_key=${OLA_MAPS_API_KEY}&path=${encodeURIComponent(pathParams)}&marker=${encodeURIComponent(startMarker)}&marker=${encodeURIComponent(endMarker)}`;
    };
    const [savedPlaces, setSavedPlaces] = useState(() => {
        const saved = localStorage.getItem('roadhazex_saved_places');
        return saved ? JSON.parse(saved) : { home: null, work: null };
    });
    const [mapStyle, setMapStyle] = useState('light'); // light, dark, satellite
    const [showTraffic, setShowTraffic] = useState(false);
    const [showHazardsLayer, setShowHazardsLayer] = useState(true);
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [availableStyles, setAvailableStyles] = useState([]); // Dynamic Tile Styles
    const [is3DReality, setIs3DReality] = useState(false); // Phase 30: 3D Buildings Toggle
    const [navPhase, setNavPhase] = useState(0); // 0: Idle, 1: Fixed, 2: Calculated, 3: Navigating
    const arrivalSpokenRef = useRef(false);
    const [streetViewImage, setStreetViewImage] = useState(null); // Phase 31: Street View
    const [isFetchingStreetView, setIsFetchingStreetView] = useState(false);

    // Phase 15: Safest Route Engine
    const [alternativeRoutes, setAlternativeRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Auto-update times & routes when travel mode changes
    useEffect(() => {
        if (navPhase >= 2 && selectedSource && selectedDestination) {
             calculateRoutes();
        }
    }, [travelMode, routePreference]);
    const [isCalculatingSafety, setIsCalculatingSafety] = useState(false);

    // Phase 16: Roads API
    const [currentRoadName, setCurrentRoadName] = useState("");
    const [snappedPath, setSnappedPath] = useState([]);

    const warnedHazards = useRef(new Set());
    const prevHazardsLength = useRef(0);

    const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";

    const showAlert = (text, voice = false) => {
        setAlertText(text);
        if (voice && isVoiceEnabled) speak(text);
        setTimeout(() => setAlertText(''), 5000);
    };

    const speak = (text) => {
        if (!window.speechSynthesis || text === lastSpokenAlert) return;
        window.speechSynthesis.cancel(); // Stop current
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
        setLastSpokenAlert(text);
    };

    // Expose fetchStreetView globally for MapLibre Popups
    useEffect(() => {
        if (isActive) {
            window.visualizeHazardProof = (lat, lng) => fetchStreetView(lat, lng);
        }
    }, [isActive]);

    // Phase 19: Live Safety Scoring (0-100)
    useEffect(() => {
        if (!isNavigating || !currentUserLocation) {
            setLiveSafetyScore(100);
            return;
        }

        let penalty = 0;
        const userPt = turf.point([currentUserLocation.lng, currentUserLocation.lat]);

        // 1. Hazard Proximity Penalty
        hazards.forEach(h => {
            if (h.resolved || !h.lat || !h.lng) return;
            const hazardPt = turf.point([h.lng, h.lat]);
            const dist = turf.distance(userPt, hazardPt, { units: 'meters' });
            
            if (dist < 500) { // Hazard within 500m
                let weight = 5;
                if (h.severity === 'high' || h.type === 'Accident') weight = 20;
                else if (h.severity === 'medium') weight = 10;
                
                // Decay penalty by distance
                penalty += (weight * (500 - dist) / 500);
            }
        });

        // 2. Speeding Penalty
        if (currentSpeedLimit && window._currentSpeed > currentSpeedLimit) {
            const diff = window._currentSpeed - currentSpeedLimit;
            penalty += (diff * 2); // 2 points per km/h over
        }

        // 3. Terrain/Elevation Penalty (Steepness)
        if (currentElevation && routeElevationProfile) {
            // Check if we are in a steep segment (placeholder logic)
            // penalty += someValue;
        }

        const newScore = Math.max(0, Math.min(100, 100 - penalty));
        setLiveSafetyScore(Math.round(newScore));

        // Journey Logging
        if (Date.now() % 30000 < 5000) { // Log every ~30s
            setJourneyRiskLogs(prev => [...prev, { time: Date.now(), score: newScore }].slice(-100));
        }

    }, [currentUserLocation, hazards, isNavigating, currentSpeedLimit]);

    // Initialize Maplibre GL JS map
    useEffect(() => {
        if (isActive && !mapInstanceRef.current && mapRef.current) {
            const startLat = currentUserLocation ? currentUserLocation.lat : 20.5937; // Center of India
            const startLng = currentUserLocation ? currentUserLocation.lng : 78.9629; 

            // Initialize Krutrim Ola Map Vector Tiles
            const map = new maplibregl.Map({
                container: mapRef.current,
                style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
                center: [startLng, startLat],
                zoom: currentUserLocation ? 15 : 4,
                transformRequest: (url, resourceType) => {
                    // Inject Ola Maps API key into all outgoing requests
                    if (url.includes('api.olamaps.io')) {
                        const separator = url.includes('?') ? '&' : '?';
                        return { url: `${url}${separator}api_key=${OLA_MAPS_API_KEY}` };
                    }
                    return { url };
                }
            });

            // Add basic UI controls (zoom/compass)
            map.addControl(new maplibregl.NavigationControl({
                visualizePitch: true,
                showCompass: true,
            }), 'top-left');

            // Shift zoom controls down so they don't hit the top navbar wrapper
            setTimeout(() => {
                const controls = document.querySelector('.maplibregl-ctrl-top-left');
                if (controls) controls.style.marginTop = '72px';
            }, 500);

            mapInstanceRef.current = map;

            map.on('load', () => {
                updateHazards();
                if (currentUserLocation) {
                    updateUserMarker(currentUserLocation.lat, currentUserLocation.lng);
                // Phase 26: Geofences Layer
                map.addSource('geofences', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
                map.addLayer({
                    id: 'geofences-fill',
                    type: 'fill',
                    source: 'geofences',
                    paint: {
                        'fill-color': '#ef4444',
                        'fill-opacity': 0.15
                    }
                });
                map.addLayer({
                    id: 'geofences-outline',
                    type: 'line',
                    source: 'geofences',
                    paint: {
                        'line-color': '#ef4444',
                        'line-width': 2,
                        'line-dasharray': [2, 1]
                    }
                });

                }

                // Phase 24: Map Click Listener
                map.on('click', (e) => {
                    const { lng, lat } = e.lngLat;
                    fetchReverseGeocode(lat, lng);
                });
            });
        } else if (isActive && mapInstanceRef.current) {
            // Resize if container changed bounds
            setTimeout(() => mapInstanceRef.current.resize(), 200);
        }
    }, [isActive]);

    // Update markers when hazards array changes or screen is loaded
    const hasInitialLoaded = useRef(false);
    useEffect(() => {
        if (mapInstanceRef.current && mapInstanceRef.current.isStyleLoaded()) {
            updateHazards();

            // Hazard Pinning Feedback: If a new hazard arrived, aggressive fly-to
            if (hasInitialLoaded.current && hazards.length > prevHazardsLength.current && hazards.length > 0) {
                const newestHazard = hazards[0];
                if (newestHazard && newestHazard.lat) {
                    mapInstanceRef.current.flyTo({ center: [newestHazard.lng, newestHazard.lat], zoom: 17, pitch: 45 });
                    showAlert(`⚠️ New Hazard Pinned: ${newestHazard.type || 'Warning'}`);
                }
            }
            if (hazards.length > 0) hasInitialLoaded.current = true;
            prevHazardsLength.current = hazards.length;
        }
    }, [hazards, isActive]);


    useEffect(() => {
        if (mapInstanceRef.current && mapStyle) {
            // Find style URL in fetched availableStyles
            const selectedStyle = availableStyles.find(s => s.id === mapStyle);
            let styleUrl = selectedStyle ? selectedStyle.url : 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';
            
            // Legacy fallbacks if dynamic fetch failed
            if (!selectedStyle) {
                if (mapStyle === 'dark') styleUrl = 'https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json';
                if (mapStyle === 'satellite') styleUrl = 'https://api.olamaps.io/tiles/vector/v1/styles/default-satellite/style.json';
            }
            
            mapInstanceRef.current.setStyle(styleUrl);
        }
    }, [mapStyle, availableStyles]);

    // Phase 30: 3D Reality Implementation
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        
        mapInstanceRef.current.on('style.load', () => {
            // Enable 3D Buildings if any style has them (extrusion)
            const layers = mapInstanceRef.current.getStyle().layers;
            layers.forEach(layer => {
                if (layer.type === 'fill-extrusion') {
                    mapInstanceRef.current.setLayoutProperty(layer.id, 'visibility', is3DReality ? 'visible' : 'none');
                }
            });

            // Experimental: Loading Ola 3D Tileset if enabled
            if (is3DReality) {
                if (!mapInstanceRef.current.getSource('ola-3d-tiles')) {
                    // Note: This is a placeholder for actual 3D Tileset integration 
                    // which usually requires a specialized plugin for b3dm files.
                    // For now, we ensure the map has a 3D terrain/building state.
                    mapInstanceRef.current.setPitch(60);
                }
            }
        });

        // Toggle existing fill-extrusion layers immediately if style is already loaded
        const layers = mapInstanceRef.current.getStyle()?.layers || [];
        layers.forEach(layer => {
            if (layer.type === 'fill-extrusion') {
                mapInstanceRef.current.setLayoutProperty(layer.id, 'visibility', is3DReality ? 'visible' : 'none');
            }
        });

    }, [is3DReality]);

    // Save Recent Search
    const addToRecentSearches = (result) => {
        const newRecent = [result, ...recentSearches.filter(r => r.place_id !== result.place_id)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('roadhazex_recent_searches', JSON.stringify(newRecent));
    };

    // Save Home/Work
    const savePlace = (type, result) => {
        const newSaved = { ...savedPlaces, [type]: result };
        setSavedPlaces(newSaved);
        localStorage.setItem('roadhazex_saved_places', JSON.stringify(newSaved));
        showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} location saved!`);
    };

    // Phase 15: Safety Scorer
    const calculateSafetyScore = (routeCoords) => {
        if (!hazards || hazards.length === 0) return 0;
        const poly = turf.lineString(routeCoords);
        let score = 0;
        
        hazards.forEach(h => {
            if (h.resolved || !h.lat || !h.lng) return;
            const pt = turf.point([h.lng, h.lat]);
            // Distance in meters
            const dist = turf.pointToLineDistance(pt, poly, { units: 'meters' });
            
            if (dist < 100) { // Hazard is within 100m of route
                // Severity Weights
                let weight = 1;
                if (h.type === 'Accident') weight = 10;
                if (h.type === 'Weather') weight = 5;
                if (h.type === 'Pothole') weight = 2;
                
                // Inverse distance weighting (closer = more risk)
                const proximityFactor = (100 - dist) / 100;
                score += weight * proximityFactor;
            }
        });
        return parseFloat(score.toFixed(2));
    };

    // Phase 15: Smart Rerouting Monitor
    useEffect(() => {
        if (!isNavigating || alternativeRoutes.length === 0) return;
        if (hazards.length > prevHazardsLength.current) {
            // New hazard detected!
            const currentRoute = alternativeRoutes[selectedRouteIndex];
            if (currentRoute) {
                const newScore = calculateSafetyScore(currentRoute.coordinates);
                // If safety score increased significantly (> 2), alert and reroute
                if (newScore > currentRoute.safetyScore + 2) {
                    showAlert("⚠️ New hazard on current route! Recalculating safest path...");
                    startNavigation(); // This will fetch new alternatives
                }
            }
            prevHazardsLength.current = hazards.length;
        }
    }, [hazards, isNavigating, alternativeRoutes, selectedRouteIndex]);

    // Update user geolocation live

    // Geofencing Proximity Alerts
    useEffect(() => {
        if (isNavigating && currentUserLocation && hazards.length > 0) {
            const userPt = turf.point([currentUserLocation.lng, currentUserLocation.lat]);
            
            // 1. Proximity Check (100m for any hazard)
            let nearestHazard = null;
            let minDistance = Infinity;

            // 2. Route Safety Check (1km for severe accidents)
            let severeAccidentSoon = null;

            hazards.forEach(h => {
                if (h.resolved || !h.lat || !h.lng) return;
                const hazardPt = turf.point([h.lng, h.lat]);
                const dist = turf.distance(userPt, hazardPt, { units: 'kilometers' });
                
                // Track nearest for general warning
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestHazard = h;
                }

                // Specifically look for accidents within 1km
                if ((h.type === 'Accident' || h.type?.toLowerCase().includes('accident')) && dist <= 1.0 && dist > 0.1) {
                    severeAccidentSoon = { hazard: h, dist };
                }
            });

            // Trigger Specific Alerts
            if (severeAccidentSoon) {
                const id = `acc-${severeAccidentSoon.hazard.id || severeAccidentSoon.hazard.lat}`;
                if (!warnedHazards.current.has(id)) {
                    warnedHazards.current.add(id);
                    showAlert(`Accident reported ${Math.round(severeAccidentSoon.dist * 1000)}m ahead. Route optimization suggested: Stay in left lane.`, true);
                }
            } else if (nearestHazard && minDistance <= 0.1) {
                const hazardId = nearestHazard.id || `${nearestHazard.lat},${nearestHazard.lng}`;
                if (!warnedHazards.current.has(hazardId)) {
                    warnedHazards.current.add(hazardId);
                    const distanceInM = Math.round(minDistance * 1000);
                    
                    let specificAdvice = "Drive carefully.";
                    if (nearestHazard.type?.toLowerCase().includes('pothole')) {
                        specificAdvice = "Maintain 20km/h speed.";
                        specificAdvice = "Slow down, possible hydroplaning.";
                    }

                    showAlert(`${nearestHazard.type} in ${distanceInM}m! ${specificAdvice}`, true);
                }
            }

            // Trigger Specific Alerts
            if (severeAccidentSoon) {
                const msg = `Caution: Serious accident reported ${severeAccidentSoon.dist.toFixed(1)} km ahead. Consider an alternative safest route.`;
                showAlert(msg, 'warning');
                speak(msg);
            }
        }
    }, [currentUserLocation, navPhase, hazards]);

    // Phase 33: Arrival Detection
    useEffect(() => {
        if (navPhase === 3 && currentUserLocation && selectedDestination && !arrivalSpokenRef.current) {
            const userPt = turf.point([currentUserLocation.lng, currentUserLocation.lat]);
            const destPt = turf.point([selectedDestination.lng, selectedDestination.lat]);
            const dist = turf.distance(userPt, destPt, { units: 'kilometers' });

            if (dist < 0.03) { // 30 meters
                arrivalSpokenRef.current = true;
                speak("You have arrived at your destination. RoadHazeX navigation complete.");
                setTimeout(() => {
                    setNavPhase(0);
                    setAlternativeRoutes([]);
                    setRouteStats(null);
                }, 3000);
            }
        }
    }, [currentUserLocation, navPhase, selectedDestination]);
    // Phase 16: Update breadcrumb layer data
    useEffect(() => {
        if (navPhase < 2 || !mapInstanceRef.current) return;
        
        const source = mapInstanceRef.current.getSource('user-breadcrumbs');
        if (source) {
            source.setData({
                type: 'Feature',
                geometry: { 
                    type: 'LineString', 
                    coordinates: snappedPath.length > 0 ? snappedPath : breadcrumbs.map(b => [b.lng, b.lat]) 
                }
            });
        }
    }, [snappedPath, breadcrumbs, navPhase]);

    // Phase 37: Re-calculate routes if mode or preference changes while in preview phase (2)
    useEffect(() => {
        if ((navPhase === 2 || navPhase === 1) && selectedSource && selectedDestination) {
            calculateRoutes();
        }
    }, [travelMode, routePreference]);

    const updateUserMarker = (lat, lng) => {
        if (!mapInstanceRef.current) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([lng, lat]);
            const el = userMarkerRef.current.getElement();
            if (el) {
                if (el.dataset.mode !== travelMode) {
                    el.dataset.mode = travelMode;
                    let icon = 'navigation';
                    if (travelMode === 'cycling') icon = 'motorcycle';
                    if (travelMode === 'walking') icon = 'directions_walk';
                    if (travelMode === 'driving') icon = 'directions_car';
                    el.innerHTML = `<span class="material-icons-round" style="font-size: 20px; color: white;">${icon}</span>`;
                }
                
                if (breadcrumbs.length > 1) {
                    const last = breadcrumbs[breadcrumbs.length - 2];
                    const bearing = turf.bearing(
                        turf.point([last.lng, last.lat]),
                        turf.point([lng, lat])
                    );
                    el.style.transform = `rotate(${bearing}deg)`;
                }
            }
        } else {
            const el = document.createElement('div');
            el.className = 'user-marker-icon-premium';
            el.dataset.mode = travelMode;
            
            let icon = 'navigation';
            if (travelMode === 'cycling') icon = 'motorcycle';
            if (travelMode === 'walking') icon = 'directions_walk';
            if (travelMode === 'driving') icon = 'directions_car';

            el.style.backgroundColor = '#4f46e5';
            el.style.width = '36px';
            el.style.height = '36px';
            el.style.borderRadius = '12px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
            el.innerHTML = `<span class="material-icons-round" style="font-size: 20px; color: white;">${icon}</span>`;
            el.style.transition = 'all 0.5s ease-out';

            userMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(mapInstanceRef.current);
            
            mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 15, speed: 1.5 });
        }
    };

    const updateHazards = () => {
        if (!mapInstanceRef.current) return;

        // Clear existing maplibre markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        hazards.forEach(h => {
            const hLng = Number(h.lng);
            const hLat = Number(h.lat);
            if (isNaN(hLng) || isNaN(hLat)) return;

            const el = document.createElement('div');
            el.className = 'hazard-marker-custom';
            
            let borderColor = '#ff3b30'; // Red
            if (h.resolved) borderColor = '#22c55e'; // Green !
            else if (h.type === 'Waterlogging / flooded roads') borderColor = '#3b82f6'; // Blue
            else if (h.type === 'Uneven roads') borderColor = '#f59e0b'; // Amber

            el.innerHTML = `
            <div style="
                width: 32px;
                height: 32px;
                background: ${borderColor};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='rotate(-45deg) scale(1.1)'" onmouseout="this.style.transform='rotate(-45deg) scale(1)'">
                <span class="material-icons-round" style="color: white; font-size: 16px; transform: rotate(45deg);">${h.resolved ? 'check' : 'warning'}</span>
            </div>`;

            // Clean custom popups
            const popupHTML = `
                <div style="font-family: 'Outfit', sans-serif; min-width: 140px; padding: 2px;">
                    <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #1f2937;">${h.type || 'Hazard'}</div>
                    ${h.image ? `<img src="${h.image}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" />` : ''}
                    <button 
                        onclick="window.visualizeHazardProof(${h.lat}, ${h.lng})"
                        style="
                            width: 100%;
                            margin-top: 8px;
                            padding: 8px;
                            background: #f5f3ff;
                            color: #4f46e5;
                            border: none;
                            border-radius: 8px;
                            font-size: 11px;
                            font-weight: 800;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                            transition: all 0.2s;
                        "
                    >
                        <span class="material-icons-round" style="font-size: 14px;">visibility</span>
                        VISUAL PROOF
                    </button>
                </div>
            `;

            const popup = new maplibregl.Popup({ offset: 35, closeButton: false, className: 'hazard-popup' })
                .setHTML(popupHTML);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([hLng, hLat])
                .setPopup(popup)
                .addTo(mapInstanceRef.current);

            // Fly to marker instead of showing warning text
            el.addEventListener('click', () => {
                 mapInstanceRef.current.flyTo({ center: [hLng, hLat], zoom: 16 });
            });

            markersRef.current.push(marker);
        });
    };

    // --- Ola Maps API Search ---
    
    // Initial Reverse Geocode for Source
    // Phase 13: Live Speed Limit Polling
    React.useEffect(() => {
        if (!isNavigating || !currentUserLocation) {
            setCurrentSpeedLimit(null);
            return;
        }

        const fetchSpeedLimit = async () => {
            try {
                const url = `https://api.olamaps.io/routing/v1/speedLimits?points=${currentUserLocation.lat},${currentUserLocation.lng}&api_key=${OLA_MAPS_API_KEY}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === 'SUCCESS' && data.speedLimits?.[0]) {
                    setCurrentSpeedLimit(data.speedLimits[0].speedLimit);
                }
            } catch (err) { console.error("Speed Limit error:", err); }
        };

        const interval = setInterval(fetchSpeedLimit, 10000); // Check every 10s
        fetchSpeedLimit();
        return () => clearInterval(interval);
    }, [isNavigating, currentUserLocation]);

    // Phase 29: Fetch Dynamic Styles
    useEffect(() => {
        const fetchStyles = async () => {
            try {
                const res = await fetch(`https://api.olamaps.io/tiles/vector/v1/styles.json?api_key=${OLA_MAPS_API_KEY}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAvailableStyles(data);
                }
            } catch (err) { console.error("Fetch Styles Error:", err); }
        };
        fetchStyles();
    }, []);

    // Phase 13: Path Refinement (Breadcrumbs)
    React.useEffect(() => {
        if (!currentUserLocation) return;
        
        setBreadcrumbs(prev => {
            const next = [...prev, { lat: currentUserLocation.lat, lng: currentUserLocation.lng }];
            // Every 5 points, snap the new segment to road
            if (next.length >= 5 && next.length % 5 === 0) {
                snapTrailToRoad(next.slice(-5));
            }
            return next.slice(-20); // Keep 20 raw points
        });

        // Periodic Nearest Road lookup
        if (isNavigating) {
            const lastRoadCheck = window._lastRoadCheck || 0;
            if (Date.now() - lastRoadCheck > 15000) { // Every 15s
                fetchNearestRoad(currentUserLocation.lat, currentUserLocation.lng);
                window._lastRoadCheck = Date.now();
            }
        }
    }, [currentUserLocation, isNavigating]);

    useEffect(() => {
        if (currentUserLocation && !selectedSource && !sourceQuery) {
            handleReverseGeocode(currentUserLocation.lat, currentUserLocation.lng);
        }
    }, [currentUserLocation]);

    const handleReverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const addr = data.results[0].formatted_address;
                    setSourceQuery("Your Location");
                    setSelectedSource({ lat, lng, name: addr });
                }
            }
        } catch (e) { console.error("Reverse Geocode Error:", e); }
    };

    // Phase 16: Roads APIs
    const snapTrailToRoad = async (points) => {
        if (points.length < 2) return;
        const ptsStr = points.map(p => `${p.lat},${p.lng}`).join('|');
        try {
            const res = await fetch(`https://api.olamaps.io/routing/v1/snapToRoad?points=${encodeURIComponent(ptsStr)}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.snappedPoints) {
                const newSnapped = data.snappedPoints.map(p => [p.location.longitude, p.location.latitude]);
                setSnappedPath(prev => [...prev, ...newSnapped].slice(-50)); // Keep last 50 segments
            }
        } catch (e) { console.error("SnapToRoad Error:", e); }
    };

    const fetchNearestRoad = async (lat, lng) => {
        try {
            const res = await fetch(`https://api.olamaps.io/routing/v1/nearestRoads?points=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.snappedPoints?.[0]?.name) {
                setCurrentRoadName(data.snappedPoints[0].name);
            }
        } catch (e) { console.error("NearestRoads Error:", e); }
    };

    const fetchAutocomplete = async (query, setResults, setIsSearching) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            // Phase 17: Use Location Biasing if available
            let url = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`;
            if (currentUserLocation) {
                url += `&location=${currentUserLocation.lat},${currentUserLocation.lng}&radius=10000`; // 10km bias
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setResults(data.predictions || []);
            }
        } catch (e) { console.error("Autocomplete Error:", e); }
        finally { setIsSearching(false); }
    };

    const fetchPlaceDetails = async (placeId) => {
        try {
            // Phase 18: Advanced Place Details
            const res = await fetch(`https://api.olamaps.io/places/v1/details/advanced?place_id=${placeId}&api_key=${OLA_MAPS_API_KEY}`);
            if (res.ok) {
                const data = await res.json();
                if (data.result && data.result.geometry) {
                    const loc = data.result.geometry.location;
                    return {
                        lat: loc.lat,
                        lng: loc.lng,
                        name: data.result.name || data.result.formatted_address,
                        rating: data.result.rating,
                        status: data.result.opening_hours?.open_now ? "Open Now" : "Closed",
                        // Advanced Fields
                        weekdayText: data.result.opening_hours?.weekday_text || [],
                        parking: data.result.parking_available,
                        accessibility: data.result.wheelchair_accessibility,
                        amenities: data.result.amenities_available || []
                    };
                }
            }
        } catch (e) { console.error("Place Details Error:", e); }
        return null;
    };

    const handleSelectPlace = async (place, type) => {
        let details = (place.lat && place.lng) ? place : await fetchPlaceDetails(place.place_id);
        
        if (details) {
            if (place.place_id) addToRecentSearches(place);

            if (type === 'source') {
                setSourceQuery(details.name);
                setSourceResults([]);
                setSelectedSource(details);
                if (selectedDestination) setNavPhase(1);
            } else if (type === 'waypoint') {
                setWaypointQuery(details.name);
                setWaypointResults([]);
                setSelectedWaypoint(details);
            } else {
                setDestQuery(details.name);
                setDestResults([]);
                setSelectedDestination(details);
                if (selectedSource) setNavPhase(1);
            }
        } else {
            showAlert("Could not retrieve exact coordinates.");
        }
    };

    // Phase 21: Auto-refresh discovery when ranking changes
    React.useEffect(() => {
        if (nearbyResults.length > 0 && !isSearchingNearby) {
            fetchNearby(nearbyType);
        }
    }, [rankBy]);

    // Phase 26: Periodic Geofence Status Monitor
    React.useEffect(() => {
        let interval;
        if (navPhase === 3 && currentUserLocation) {
            fetchGeofences(); // Initial fetch
            interval = setInterval(() => {
                checkGeofenceStatus(currentUserLocation.lat, currentUserLocation.lng);
            }, 5000); // Check every 5s
        }
        return () => clearInterval(interval);
    }, [navPhase, currentUserLocation, activeGeofences.length]);

    // Phase 26: Sync activeGeofences state to Map Source
    React.useEffect(() => {
        if (mapInstanceRef.current && mapInstanceRef.current.getSource('geofences')) {
            const features = activeGeofences.map(fence => {
                const center = [fence.coordinates[0][1], fence.coordinates[0][0]]; // [lng, lat]
                if (fence.type === 'circle') {
                    const circle = turf.circle(center, fence.radius / 1000, { units: 'kilometers' });
                    return { ...circle, properties: { id: fence.geofenceId, name: fence.name } };
                }
                // Handle polygons if needed
                return {
                    type: 'Feature',
                    properties: { id: fence.geofenceId, name: fence.name },
                    geometry: { type: 'Polygon', coordinates: [fence.coordinates.map(c => [c[1], c[0]])] }
                };
            });

            mapInstanceRef.current.getSource('geofences').setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }, [activeGeofences, mapInstanceRef.current]);

    // Phase 26: Watch hazards prop and create missing geofences
    React.useEffect(() => {
        if (hazards && hazards.length > 0) {
            hazards.forEach(h => {
                if (!activeGeofences.some(g => g.name.includes(h.id))) {
                    createGeofence(h);
                }
            });
        }
    }, [hazards, activeGeofences.length]);




    // Phase 22: Global Text Search
    const fetchTextSearch = async (query) => {
        if (!query || query.length < 3) return;
        setIsSearchingText(true);
        setDestResults([]); // Clear autocomplete
        setShowNearbyMenu(false);
        
        try {
            const params = new URLSearchParams({
                input: query,
                location: currentUserLocation ? `${currentUserLocation.lat},${currentUserLocation.lng}` : '',
                radius: '10000',
                api_key: OLA_MAPS_API_KEY
            });

            const res = await fetch(`https://api.olamaps.io/places/v1/textsearch?${params.toString()}`);
            const data = await res.json();

            if (data.status === 'ok' && data.predictions?.[0]?.length > 0) {
                const results = data.predictions[0].map(p => ({
                    ...p,
                    name: p.name,
                    address: p.formatted_address,
                    lat: p.geometry?.location?.lat,
                    lng: p.geometry?.location?.lng,
                    place_id: p.place_id
                }));
                setTextSearchResults(results);
                showAlert(`Found ${results.length} results for "${query}"`);
                
                // Add markers for text search
                markersRef.current.forEach(m => m.remove());
                markersRef.current = [];
                
                results.forEach(p => {
                    if (p.lat && p.lng) {
                        const marker = new maplibregl.Marker({ color: '#3b82f6' })
                            .setLngLat([p.lng, p.lat])
                            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
                                <div style="font-family: 'Outfit'; padding: 8px; min-width: 140px;">
                                    <div style="font-weight: 800; font-size: 13px;">${p.name}</div>
                                    <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${p.address}</div>
                                </div>
                            `))
                            .addTo(mapInstanceRef.current);
                        markersRef.current.push(marker);
                    }
                });

                if (results[0].lat) mapInstanceRef.current.flyTo({ center: [results[0].lng, results[0].lat], zoom: 12 });
            } else {
                showAlert("No exact matches found. Try broadening your query.");
            }
        } catch (e) {
            console.error("Text Search Error:", e);
            showAlert("Search service briefly unavailable.");
        } finally {
            setIsSearchingText(false);
        }
    };

    // Phase 23: Address Validation
    const validateAddress = async (address) => {
        if (!address) return;
        setIsValidating(true);
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/addressvalidation?address=${encodeURIComponent(address)}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.status === 'ok' && data.result?.validated) {
                setValidationResult(data.result);
                showAlert("Address components verified successfully.");
            } else {
                showAlert(data.error_message || "Address could not be fully validated.");
            }
        } catch (e) {
            console.error("Validation Error:", e);
        } finally {
            setIsValidating(false);
        }
    };

    // Phase 24: Reverse Geocoding
    const fetchReverseGeocode = async (lat, lng) => {
        setIsGeocoding(true);
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.status === 'ok' && data.results?.[0]) {
                const result = data.results[0];
                setClickedLocation({
                    lat, lng,
                    address: result.formatted_address,
                    name: result.name || "Selected Location",
                    accuracy: result.geometry?.location_type
                });
            }
        } catch (e) {
            console.error("Reverse Geocode Error:", e);
        } finally {
            setIsGeocoding(false);
        }
    };

    // Phase 25: Forward Geocoding
    
    
    // Phase 27: Elevation APIs
    const fetchElevation = async (lat, lng) => {
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/elevation?location=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.status === 'ok' && data.results?.[0]) {
                setCurrentElevation(data.results[0].elevation);
            }
        } catch (err) {
            console.error("Elevation fetch failed:", err);
        }
    };

    const fetchRouteElevation = async (coordinates) => {
        // Max 25 locations per batch request
        const sampledPoints = [];
        const step = Math.max(1, Math.floor(coordinates.length / 20));
        for (let i = 0; i < coordinates.length && sampledPoints.length < 25; i += step) {
            sampledPoints.push(`${coordinates[i][1]},${coordinates[i][0]}`); // "lat,lng" string
        }

        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/elevation?api_key=${OLA_MAPS_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: sampledPoints })
            });
            const data = await res.json();
            if (data.status === 'ok' && data.results) {
                const elevations = data.results.map(r => r.elevation);
                let totalAscent = 0;
                for (let i = 1; i < elevations.length; i++) {
                    const diff = elevations[i] - elevations[i-1];
                    if (diff > 0) totalAscent += diff;
                }
                setRouteElevationProfile({ totalAscent, elevations });
            }
        } catch (err) {
            console.error("Route elevation fetch failed:", err);
        }
    };

    // Phase 26: Geofencing APIs
    const createGeofence = async (hazard) => {
        // Prevent duplicate creation for the same hazard ID
        if (activeGeofences.some(g => g.name.includes(hazard.id))) return;

        try {
            const body = {
                name: `Hazard_${hazard.type}_${hazard.id}`,
                type: "circle",
                radius: 200, // 200m safety radius
                coordinates: [[hazard.lat, hazard.lng]],
                status: "active",
                projectId: "RoadHazeX_Production"
            };

            const res = await fetch(`https://api.olamaps.io/places/v1/geofence?api_key=${OLA_MAPS_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.status === 'created') {
                setActiveGeofences(prev => [...prev, { ...body, geofenceId: data.geofenceId }]);
                console.log("Geofence created for hazard:", data.geofenceId);
            }
        } catch (err) {
            console.error("Geofence creation failed:", err);
        }
    };

    const fetchGeofences = async () => {
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/geofences?page=1&size=50&projectId=RoadHazeX_Production&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.geofences) {
                setActiveGeofences(data.geofences.map(g => g.schema));
            }
        } catch (err) {
            console.error("Failed to fetch geofences:", err);
        }
    };

    const checkGeofenceStatus = async (lat, lng) => {
        if (activeGeofences.length === 0) return;
        
        // Only check every few seconds to save API quota
        const now = Date.now();
        if (now - lastAlertTime < 5000) return; 

        for (const fence of activeGeofences) {
            try {
                const res = await fetch(`https://api.olamaps.io/places/v1/geofence/status?geofenceId=${fence.geofenceId}&coordinates=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
                const data = await res.json();
                
                if (data.isInside && !isInsideGeofence) {
                    setIsInsideGeofence(true);
                    setCurrentGeofenceId(fence.geofenceId);
                    setLastAlertTime(now);
                    showAlert(`⚠️ SAFETY ALERT: You have entered a high-risk ${fence.name.split('_')[1] || 'Hazard'} zone!`, true);
                    
                    // Trigger haptic/mock audio
                    if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
                } else if (!data.isInside && isInsideGeofence && currentGeofenceId === fence.geofenceId) {
                    setIsInsideGeofence(false);
                    setCurrentGeofenceId(null);
                }
            } catch (err) {
                console.error("Status check failed:", err);
            }
        }
    };

    const deleteGeofence = async (id) => {
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/geofence/${id}?api_key=${OLA_MAPS_API_KEY}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.status === 'deleted') {
                setActiveGeofences(prev => prev.filter(g => g.geofenceId !== id));
            }
        } catch (err) {
            console.error("Delete geofence failed:", err);
        }
    };

    const fetchForwardGeocode = async (address) => {
        if (!address) return;
        setIsGeocoding(true);
        try {
            const res = await fetch(`https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(address)}&api_key=${OLA_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.status === 'ok' && data.geocodingResults?.[0]) {
                const results = data.geocodingResults.map(r => ({
                    ...r,
                    name: r.name || r.formatted_address.split(',')[0],
                    address: r.formatted_address,
                    lat: r.geometry?.location?.lat,
                    lng: r.geometry?.location?.lng,
                    place_id: r.place_id
                }));
                setGeocodingResults(results);
                showAlert(`Precision match: ${results[0].address}`);
                
                // Fly to first result
                if (results[0].lat) {
                    mapInstanceRef.current.flyTo({ center: [results[0].lng, results[0].lat], zoom: 16 });
                    setSelectedDestination(results[0]);
                }
            } else {
                showAlert("No exact address match. Try Global Search.");
            }
        } catch (e) {
            console.error("Geocoding Error:", e);
        } finally {
            setIsGeocoding(false);
        }
    };

    const fetchNearby = async (type) => {
        if (!currentUserLocation) return;
        setShowNearbyMenu(false);
        setIsSearchingNearby(true);
        setNearbyResults([]);
        
        try {
            // Phase 21: Advanced Nearby Search
            const params = new URLSearchParams({
                location: `${currentUserLocation.lat},${currentUserLocation.lng}`,
                radius: '5000',
                types: type,
                rankBy: rankBy,
                withCentroid: 'true',
                api_key: OLA_MAPS_API_KEY
            });

            const res = await fetch(`https://api.olamaps.io/places/v1/nearbysearch/advanced?${params.toString()}`);
            const data = await res.json();

            if (data.status === 'ok' && data.predictions?.length > 0) {
                const enrichedResults = data.predictions.map(p => {
                    const photoRef = p.photos?.[0]?.photo_reference;
                    const photoUrl = photoRef ? `https://api.olamaps.io/places/v1/photo?photo_reference=${photoRef}&api_key=${OLA_MAPS_API_KEY}` : null;
                    
                    return {
                        ...p,
                        geometry: p.geometry || { location: { lat: 0, lng: 0 } },
                        name: p.structured_formatting?.main_text || "POI",
                        address: p.structured_formatting?.secondary_text || "",
                        openNow: p.opening_hours?.open_now,
                        photo: photoUrl,
                        type: type
                    };
                });

                setNearbyResults(enrichedResults);

                // Clear markers
                markersRef.current.forEach(m => m.remove());
                markersRef.current = [];

                enrichedResults.forEach(p => {
                    const lat = p.geometry.location.lat;
                    const lng = p.geometry.location.lng;
                    
                    const el = document.createElement('div');
                    el.className = 'nearby-marker';
                    el.innerHTML = `
                        <div style="background: white; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #f59e0b; display: flex; items-center; justify-content: center; shadow: 0 4px 12px rgba(0,0,0,0.2);">
                            <span class="material-icons-round" style="font-size: 16px; color: #f59e0b;">${
                                type === 'hospital' ? 'local_hospital' : 
                                type === 'gas_station' ? 'local_gas_station' : 
                                type === 'police' ? 'policy' : 'explore'
                            }</span>
                        </div>
                    `;

                    const popupHTML = `
                        <div style="font-family: 'Outfit'; min-width: 200px; padding: 2px;">
                            ${p.photo ? `<img src="${p.photo}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 12px; margin-bottom: 8px; border: 1px solid rgba(0,0,0,0.05);" />` : ''}
                            <div style="padding: 0 4px;">
                                <div style="font-weight: 800; font-size: 15px; margin-bottom: 2px; color: #111827;">${p.name}</div>
                                <div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 10px;">${p.address}</div>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    ${p.rating ? `<span style="background: #FFFBEB; color: #B45309; border: 1px solid #FEF3C7; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px; display: flex; align-items: center; gap: 4px;"><span class="material-icons-round" style="font-size: 12px;">star</span>${p.rating}</span>` : ''}
                                    <span style="background: ${p.openNow ? '#F0FDF4' : '#FEF2F2'}; color: ${p.openNow ? '#15803D' : '#B91C1C'}; border: 1px solid ${p.openNow ? '#DCFCE7' : '#FEE2E2'}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px;">
                                        ${p.openNow ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;

                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat([lng, lat])
                        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(popupHTML))
                        .addTo(mapInstanceRef.current);
                    
                    markersRef.current.push(marker);
                });

                showAlert(`Advanced Discovery: Found ${enrichedResults.length} ${type} results.`);
                // Fit bounds
                const bounds = new maplibregl.LngLatBounds();
                enrichedResults.forEach(p => bounds.extend([p.geometry.location.lng, p.geometry.location.lat]));
                mapInstanceRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });

            } else if (data.status === 'zero_results') {
                showAlert(`No ${type} found nearby. Try increasing search range.`);
            } else {
                throw new Error(data.error_message || "Discovery Service Error");
            }
        } catch (e) { 
            console.error("Advanced Nearby Error:", e);
            showAlert("Discovery System Offline. Using local data.");
        } finally {
            setIsSearchingNearby(false);
        }
    };

    const fetchDistanceMatrix = async () => {
        if (!currentUserLocation || hazards.length === 0) {
            showAlert("Need location & hazards for ETA matrix.");
            return;
        }
        setShowNearbyMenu(false);
        const userPt = turf.point([currentUserLocation.lng, currentUserLocation.lat]);
        const sorted = [...hazards].map(h => ({ ...h, dist: turf.distance(userPt, turf.point([h.lng, h.lat])) }))
            .sort((a,b) => a.dist - b.dist).slice(0, 3);
            
        if(sorted.length === 0) return;

        const origins = `${currentUserLocation.lat},${currentUserLocation.lng}`;
        const destinations = sorted.map(h => `${h.lat},${h.lng}`).join('|');
        
        try {
            const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&api_key=${OLA_MAPS_API_KEY}`;
            const res = await fetch(url, {
                headers: { 'X-Request-Id': `dm-${Date.now()}` }
            });
            
            if(res.ok) {
                const data = await res.json();
                if(data.rows && data.rows[0].elements) {
                    const els = data.rows[0].elements;
                    let msg = "Batch ETAs to Hazards: ";
                    els.forEach((el, i) => {
                        if(el.status === "OK") {
                            const mins = Math.round(el.duration / 60);
                            msg += `${sorted[i].type}: ${mins}m | `;
                        }
                    });
                    showAlert(msg);
                }
            } else {
                showAlert("Distance Matrix Error: Check API quota.");
            }
        } catch(e) { 
            console.error("Distance Matrix Error", e); 
            showAlert("Failed to sync hazard ETAs.");
        }
    };

    const optimizeRoute = async () => {
        if (!selectedSource || !selectedWaypoint || !selectedDestination) {
            showAlert("Add a Stop (Waypoint) to use the Route Optimizer.");
            return;
        }

        const locations = [
            `${selectedSource.lat},${selectedSource.lng}`,
            `${selectedWaypoint.lat},${selectedWaypoint.lng}`,
            `${selectedDestination.lat},${selectedDestination.lng}`
        ].join('|');

        try {
            const res = await fetch(`https://api.olamaps.io/routing/v1/routeOptimizer?locations=${encodeURIComponent(locations)}&mode=${travelMode}&api_key=${OLA_MAPS_API_KEY}`, {
                method: 'POST',
                headers: { 'X-Request-Id': `opt-${Date.now()}` }
            });
            const data = await res.json();

            if (data.status === 'OK' && data.routes?.[0]?.waypoint_order) {
                // Reordering logic for waypoints
                // For 3 points (S,W,D), if order is [0, 1, 2], nothing changes.
                // If it were different, we'd update our states.
                showAlert("Route Optimized! Your stops have been reordered for maximum efficiency.");
                startNavigation(); // Restart with optimized order
            } else {
                showAlert("Route Optimization not needed for this simple path.");
            }
        } catch (e) {
            console.error("Optimizer Error:", e);
            showAlert("Route Optimizer unreachable.");
        }
    };

    const toggle3D = () => {
        const next = !is3D;
        setIs3D(next);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setPitch(next ? 60 : 0);
            mapInstanceRef.current.setBearing(next ? -25 : 0);
        }
    };

    // Phase 31: Street View Engine
    const fetchStreetView = async (lat, lng) => {
        setIsFetchingStreetView(true);
        setStreetViewImage(null);
        try {
            // Step 1: Get Nearest ImageId
            const idRes = await fetch(`https://api.olamaps.io/sli/v1/streetview/imageId?lat=${lat}&lon=${lng}&radius=50&api_key=${OLA_MAPS_API_KEY}`);
            const idData = await idRes.json();
            
            // Check nested array response structure as per docs: [[{...}]]
            const payload = idData[0]?.[0]?.payload || idData[0]?.payload || idData.payload;
            const imageId = payload?.imageId || idData[0]?.[0]?.imageId;

            if (imageId) {
                // Step 2: Get Metadata (Image URL)
                const metaRes = await fetch(`https://api.olamaps.io/sli/v1/streetview/metadata?imageId=${imageId}&api_key=${OLA_MAPS_API_KEY}`);
                const metaData = await metaRes.json();
                const metaPayload = metaData[0]?.[0]?.payload || metaData[0]?.payload || metaData.payload;
                
                if (metaPayload?.imageUrl) {
                    setStreetViewImage({
                        url: metaPayload.imageUrl,
                        lat: metaPayload.lat,
                        lng: metaPayload.lon,
                        bearing: metaPayload.bearing || 0,
                        imageId: imageId
                    });
                } else {
                    showAlert("No street-level imagery found for this precise spot.");
                }
            } else {
                showAlert("Street View coverage unavailable here.");
            }
        } catch (err) {
            console.error("Street View Error:", err);
            showAlert("Could not load Street View.");
        } finally {
            setIsFetchingStreetView(false);
        }
    };

    const calculateRoutes = async () => {
        if (!selectedSource || !selectedDestination) {
            alert("Please ensure both Source and Destination are selected.");
            return;
        }
        await startNavigation(true); // Fetch routes only
    };

    const startNavigation = async (justFetch = false) => {
        if (!selectedSource || !selectedDestination) return;

        if (mapInstanceRef.current) {
            const originLoc = { lat: selectedSource.lat, lng: selectedSource.lng };
            const destLoc = [selectedDestination.lng, selectedDestination.lat];

            if (!justFetch) {
                setNavPhase(3);
                // Markers
                new maplibregl.Marker({ color: '#10b981' })
                    .setLngLat([originLoc.lng, originLoc.lat])
                    .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`<div style="font-family: 'Outfit'; font-weight: bold; padding: 4px;">Start: ${selectedSource.name}</div>`))
                    .addTo(mapInstanceRef.current);

                new maplibregl.Marker({ color: '#ef4444' })
                    .setLngLat(destLoc)
                    .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`<div style="font-family: 'Outfit'; font-weight: bold; padding: 4px;">End: ${selectedDestination.name}</div>`))
                    .addTo(mapInstanceRef.current);
            }

            try {
                setIsCalculatingSafety(true);
                const olaMode = travelMode === 'driving' ? 'car' : (travelMode === 'cycling' ? 'two_wheeler' : 'pedestrian');
                
                const params = new URLSearchParams({
                    origin: `${originLoc.lat},${originLoc.lng}`,
                    destination: `${selectedDestination.lat},${selectedDestination.lng}`,
                    mode: olaMode,
                    alternatives: 'true',
                    traffic_metadata: 'true',
                    overview: 'full',
                    route_preference: routePreference,
                    language: routingLanguage,
                    api_key: OLA_MAPS_API_KEY
                });

                const res = await fetch(`https://api.olamaps.io/routing/v1/directions?${params.toString()}`, {
                    method: 'POST',
                    headers: { 'X-Request-Id': Date.now().toString(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.routes && data.routes.length > 0) {
                        const processedRoutes = data.routes.map((r, index) => {
                            const decoded = polyline.decode(r.overview_polyline);
                            const coords = decoded.map(c => [c[1], c[0]]);
                            const safetyScore = calculateSafetyScore(coords);
                            const leg = r.legs?.[0];
                            return {
                                ...r, index, coordinates: coords, safetyScore,
                                distance: leg ? (leg.distance / 1000).toFixed(1) + " km" : "?? km",
                                duration: leg ? Math.ceil(leg.duration / 60) + " min" : "?? min",
                                durationSec: leg ? leg.duration : Infinity
                            };
                        });

                        setAlternativeRoutes(processedRoutes);
                        const primary = processedRoutes[0];
                        setRouteStats({ distance: primary.distance, duration: primary.duration });
                        
                        // Set phase to calculated if we were just fetching
                        if (justFetch) setNavPhase(2);
                        
                        // Drawing logic
                        if (mapInstanceRef.current.getSource('route')) {
                            mapInstanceRef.current.removeLayer('route');
                            mapInstanceRef.current.removeSource('route');
                        }

                        mapInstanceRef.current.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: { color: travelMode === 'walking' ? '#10b981' : (travelMode === 'cycling' ? '#f59e0b' : '#3b82f6') },
                                geometry: { type: 'LineString', coordinates: primary.coordinates }
                            }
                        });

                        mapInstanceRef.current.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 
                                'line-color': ['get', 'color'],
                                'line-width': 6, 
                                'line-dasharray': (travelMode === 'walking' || travelMode === 'cycling') ? [2, 1] : [1]
                            }
                        });

                        // Fit bounds
                        const bounds = new maplibregl.LngLatBounds();
                        primary.coordinates.forEach(c => bounds.extend(c));
                        mapInstanceRef.current.fitBounds(bounds, { padding: 80, duration: 1500 });

                        if (!justFetch) {
                            // Add breadcrumbs source for active navigation
                            if (!mapInstanceRef.current.getSource('user-breadcrumbs')) {
                                mapInstanceRef.current.addSource('user-breadcrumbs', {
                                    type: 'geojson',
                                    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[originLoc.lng, originLoc.lat]] } }
                                });
                                mapInstanceRef.current.addLayer({
                                    id: 'breadcrumbs-line',
                                    type: 'line',
                                    source: 'user-breadcrumbs',
                                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                                    paint: { 'line-color': '#10b981', 'line-width': 3, 'line-opacity': 0.6 }
                                });
                            }
                            warnedHazards.current.clear();
                            arrivalSpokenRef.current = false;
                        }
                    }
                }
            } catch (err) {
                console.error("Navigation error:", err);
            } finally {
                setIsCalculatingSafety(false);
            }
        }
    };

    const endNavigation = () => {
        setNavPhase(0);
        setSelectedSource(null);
        setSelectedDestination(null);
        setSourceQuery('');
        setDestQuery('');
        setAlternativeRoutes([]);
        setRouteStats(null);
        setSnappedPath([]);
        setBreadcrumbs([]);
        
        if (mapInstanceRef.current) {
            if (mapInstanceRef.current.getSource('route')) {
                mapInstanceRef.current.removeLayer('route');
                mapInstanceRef.current.removeSource('route');
            }
            if (mapInstanceRef.current.getSource('user-breadcrumbs')) {
                mapInstanceRef.current.removeLayer('breadcrumbs-line');
                mapInstanceRef.current.removeSource('user-breadcrumbs');
            }
            // Clear markers and popups
            const popups = document.getElementsByClassName('maplibregl-popup');
            while(popups[0]) popups[0].parentNode.removeChild(popups[0]);
        }
    };

    if (!isActive) return null;

    return (
        <section className="absolute inset-0 flex flex-col bg-bg-gradient z-10">
            <div className="relative w-full h-full overflow-hidden bg-gray-200">
                <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }} className="z-0"></div>

                {/* Speed Limit Indicator (Visible only during navigation) */}
                {navPhase === 3 && currentSpeedLimit && (
                    <div className="absolute top-36 left-4 z-1000 bg-white border-4 border-red-600 rounded-full w-[60px] h-[60px] flex flex-col items-center justify-center shadow-xl transform transition-transform animate-pop-in">
                        <span className="text-[10px] font-bold text-gray-400 leading-none mb-0.5">MAX</span>
                        <span className="text-2xl font-black text-gray-900 leading-none">{currentSpeedLimit}</span>
                    </div>
                )}

                {/* Phase 16: Current Road Branding Pill */}
                {isNavigating && currentRoadName && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-1000 animate-slide-down">
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">CURRENTLY ON</span>
                            <span className="text-[13px] font-black text-white px-2 py-0.5 rounded-lg bg-white/10">{currentRoadName}</span>
                        </div>
                    </div>
                )}
                {/* Phase 19: Safety Scoreboard (Top Right) */}
                {isNavigating && (
                    <div className="absolute top-20 right-4 z-2000 animate-slide-left">
                        <div className="bg-white/90 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-2xl flex flex-col items-center group overflow-hidden relative">
                            {/* Animated Background Progress Ring */}
                            <svg className="w-16 h-16 transform -rotate-90">
                                <circle
                                    cx="32" cy="32" r="28"
                                    stroke="currentColor" strokeWidth="6"
                                    fill="transparent"
                                    className="text-gray-100"
                                />
                                <circle
                                    cx="32" cy="32" r="28"
                                    stroke="currentColor" strokeWidth="6"
                                    fill="transparent"
                                    strokeDasharray={175.9}
                                    strokeDashoffset={175.9 * (1 - liveSafetyScore / 100)}
                                    strokeLinecap="round"
                                    className={`transition-all duration-1000 ${
                                        liveSafetyScore > 80 ? 'text-emerald-500' : 
                                        liveSafetyScore > 40 ? 'text-orange-500' : 'text-red-500'
                                    }`}
                                />
                            </svg>
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center mt-3">
                                <span className={`text-[15px] font-black ${
                                    liveSafetyScore > 80 ? 'text-emerald-600' : 
                                    liveSafetyScore > 40 ? 'text-orange-600' : 'text-red-600'
                                }`}>{liveSafetyScore}</span>
                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter -mt-1">SCORE</span>
                            </div>

                            {/* Voice Control Toggle */}
                            <button 
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                className={`mt-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isVoiceEnabled ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-gray-50 text-gray-400 opacity-50'}`}
                                title={isVoiceEnabled ? "Voice Alerts ON" : "Voice Alerts OFF"}
                            >
                                <span className="material-icons-round text-sm">{isVoiceEnabled ? 'volume_up' : 'volume_off'}</span>
                            </button>
                            
                            <div className="absolute -bottom-1 left-0 w-full h-1">
                                <div className={`h-full transition-all duration-500 ${liveSafetyScore > 50 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${liveSafetyScore}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overhauled Dual Search Header */}
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-3 z-3000 max-w-xl mx-auto">
                    <div className="flex gap-3">
                        <button className="bg-white text-gray-800 rounded-[20px] w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors shrink-0" onClick={toggleSidebar}>
                            <span className="material-icons-round">menu</span>
                        </button>
                        
                        <div className="flex-1 flex flex-col gap-2">
                            {/* Source Input */}
                            <div className="relative">
                                <div className="bg-white text-gray-800 py-3 px-4 rounded-[20px] flex items-center gap-3 shadow-md w-full h-11 border border-gray-50">
                                    <span className="material-icons-round text-green-500 text-[20px]">my_location</span>
                                    <input
                                        type="text"
                                        placeholder="From (Source)..."
                                        className="bg-transparent border-none outline-none text-gray-800 w-full text-[14px] font-medium placeholder-gray-400"
                                        value={sourceQuery}
                                        onChange={(e) => {
                                            setSourceQuery(e.target.value);
                                            fetchAutocomplete(e.target.value, setSourceResults, setIsSearchingSource);
                                            setSelectedSource(null);
                                        }}
                                        disabled={isNavigating}
                                    />
                                </div>
                                {sourceResults.length === 0 && !sourceQuery && !isNavigating && (
                                    <ul className="absolute top-[48px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-4000 py-1 overflow-hidden">
                                        {savedPlaces.home && (
                                            <li className="p-3 mx-2 rounded-xl hover:bg-blue-50 flex items-center gap-3 cursor-pointer" onClick={() => handleSelectPlace(savedPlaces.home, 'source')}>
                                                <span className="material-icons-round text-blue-600 text-[18px]">home</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-900">Home</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{savedPlaces.home.description}</div>
                                                </div>
                                            </li>
                                        )}
                                        {savedPlaces.work && (
                                            <li className="p-3 mx-2 rounded-xl hover:bg-blue-50 flex items-center gap-3 cursor-pointer" onClick={() => handleSelectPlace(savedPlaces.work, 'source')}>
                                                <span className="material-icons-round text-blue-600 text-[18px]">work</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-900">Work</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{savedPlaces.work.description}</div>
                                                </div>
                                            </li>
                                        )}
                                        {recentSearches.map((r, idx) => (
                                            <li key={`recent-src-${idx}`} className="p-3 mx-2 rounded-xl hover:bg-gray-50 flex items-center gap-3 cursor-pointer" onClick={() => handleSelectPlace(r, 'source')}>
                                                <span className="material-icons-round text-gray-400 text-[18px]">history</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-700 truncate">{r.structured_formatting?.main_text || r.description}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{r.description}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {sourceResults.length > 0 && !isNavigating && (
                                    <ul className="absolute top-[48px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto z-4000 py-1">
                                        {sourceResults.map((p) => (
                                            <li key={p.place_id} className="p-3 mx-2 rounded-xl hover:bg-green-50 flex items-center gap-3 cursor-pointer group" onClick={() => handleSelectPlace(p, 'source')}>
                                                <span className="material-icons-round text-green-600 text-[18px]">location_on</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-900 truncate">{p.structured_formatting?.main_text || p.description}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{p.structured_formatting?.secondary_text || ''}</div>
                                                </div>
                                                <div className="hidden group-hover:flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); savePlace('home', p); }} className="p-1 hover:bg-blue-100 rounded-full text-blue-600" title="Set as Home"><span className="material-icons-round text-sm">home</span></button>
                                                    <button onClick={(e) => { e.stopPropagation(); savePlace('work', p); }} className="p-1 hover:bg-blue-100 rounded-full text-blue-600" title="Set as Work"><span className="material-icons-round text-sm">work</span></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Waypoint Input (Optional) */}
                            {showWaypointField && !isNavigating && (
                                <div className="relative animate-slide-down">
                                    <div className="bg-white text-gray-800 py-3 px-4 rounded-[20px] flex items-center gap-3 shadow-md w-full h-11 border border-indigo-100">
                                        <span className="material-icons-round text-indigo-500 text-[20px]">add_location</span>
                                        <input
                                            type="text"
                                            placeholder="Add Stop (Waypoint)..."
                                            className="bg-transparent border-none outline-none text-gray-800 w-full text-[14px] font-medium placeholder-gray-400"
                                            value={waypointQuery}
                                            onChange={(e) => {
                                                setWaypointQuery(e.target.value);
                                                fetchAutocomplete(e.target.value, setWaypointResults, setIsSearchingWaypoint);
                                                setSelectedWaypoint(null);
                                            }}
                                        />
                                        <button 
                                            onClick={optimizeRoute} 
                                            className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md font-bold hover:bg-indigo-700 transition-colors"
                                            title="Optimize Stops Order"
                                        >
                                            Optimize
                                        </button>
                                        <button onClick={() => { setShowWaypointField(false); setSelectedWaypoint(null); setWaypointQuery(''); }} className="text-gray-400 hover:text-red-500 p-1">
                                            <span className="material-icons-round text-sm">close</span>
                                        </button>
                                    </div>
                                    {waypointResults.length > 0 && (
                                        <ul className="absolute top-[48px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto z-4000 py-1">
                                            {waypointResults.map((p) => (
                                                <li key={p.place_id} className="p-3 mx-2 rounded-xl hover:bg-indigo-50 flex items-center gap-3 cursor-pointer" onClick={() => handleSelectPlace(p, 'waypoint')}>
                                                    <span className="material-icons-round text-indigo-600 text-[18px]">location_on</span>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="text-[13px] font-bold text-gray-900 truncate">{p.structured_formatting?.main_text || p.description}</div>
                                                        <div className="text-[10px] text-gray-500 truncate">{p.structured_formatting?.secondary_text || ''}</div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Destination Input */}
                            <div className="relative">
                                <div className="bg-white text-gray-800 py-3 px-4 rounded-[20px] flex items-center gap-3 shadow-md w-full h-11 border border-gray-50 group-focus-within:border-red-400/50 transition-all">
                                    <span className="material-icons-round text-red-500 text-[20px]">place</span>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <input
                                            type="text"
                                            placeholder="To (Destination)..."
                                            className="bg-transparent border-none outline-none text-gray-800 w-full text-[14px] font-medium placeholder-gray-400"
                                            value={destQuery}
                                            onChange={(e) => {
                                                setDestQuery(e.target.value);
                                                fetchAutocomplete(e.target.value, setDestResults, setIsSearchingDest);
                                                setSelectedDestination(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') fetchTextSearch(destQuery);
                                            }}
                                            disabled={isNavigating}
                                        />
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5 opacity-60">
                                            {selectedDestination ? 'Destination Selected' : 'Wide Search Enabled (Press Enter)'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => fetchTextSearch(destQuery)}
                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Global Search"
                                    >
                                        <span className={`material-icons-round text-[18px] ${isSearchingText ? 'animate-spin' : ''}`}>
                                            {isSearchingText ? 'autorenew' : 'search'}
                                        </span>
                                    </button>
                                    {!showWaypointField && !isNavigating && (
                                        <button onClick={() => setShowWaypointField(true)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-full flex items-center justify-center">
                                            <span className="material-icons-round text-[18px]">add</span>
                                        </button>
                                    )}
                                </div>
                                {destResults.length === 0 && !destQuery && !isNavigating && (
                                    <ul className="absolute top-[48px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-4000 py-1 overflow-hidden">
                                         {savedPlaces.home && (
                                             <li className="p-3 mx-2 rounded-xl hover:bg-blue-50 flex items-center justify-between group cursor-pointer" onClick={() => handleSelectPlace(savedPlaces.home, 'destination')}>
                                                 <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className="material-icons-round text-blue-600 text-[18px]">home</span>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="text-[13px] font-bold text-gray-900">Home</div>
                                                        <div className="text-[10px] text-gray-500 truncate">{savedPlaces.home.description}</div>
                                                    </div>
                                                 </div>
                                                 <button 
                                                    onClick={(e) => { e.stopPropagation(); validateAddress(savedPlaces.home.description); }}
                                                    className="p-1.5 bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Validate Address"
                                                 >
                                                    <span className="material-icons-round text-[14px]">{isValidating ? 'sync' : 'verified'}</span>
                                                    <span className="text-[8px] font-black uppercase">Validate</span>
                                                 </button>
                                             </li>
                                         )}
                                         {savedPlaces.work && (
                                             <li className="p-3 mx-2 rounded-xl hover:bg-blue-50 flex items-center justify-between group cursor-pointer" onClick={() => handleSelectPlace(savedPlaces.work, 'destination')}>
                                                 <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className="material-icons-round text-blue-600 text-[18px]">work</span>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="text-[13px] font-bold text-gray-900">Work</div>
                                                        <div className="text-[10px] text-gray-500 truncate">{savedPlaces.work.description}</div>
                                                    </div>
                                                 </div>
                                                 <button 
                                                    onClick={(e) => { e.stopPropagation(); validateAddress(savedPlaces.work.description); }}
                                                    className="p-1.5 bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Validate Address"
                                                 >
                                                    <span className="material-icons-round text-[14px]">{isValidating ? 'sync' : 'verified'}</span>
                                                    <span className="text-[8px] font-black uppercase">Validate</span>
                                                 </button>
                                             </li>
                                         )}

                                         {/* Validation Modal Inline */}
                                         {validationResult && (
                                             <div className="mx-2 mb-2 p-3 bg-green-50/90 backdrop-blur-md rounded-xl border border-green-100 animate-slide-up">
                                                 <div className="flex items-center justify-between mb-2">
                                                     <div className="text-[9px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1">
                                                         <span className="material-icons-round text-[14px]">shield</span> Precise Data Confirmed
                                                     </div>
                                                     <button onClick={() => setValidationResult(null)} className="text-green-600"><span className="material-icons-round text-sm">close</span></button>
                                                 </div>
                                                 <div className="flex flex-wrap gap-1.5">
                                                     {validationResult.address_components?.map((c, i) => {
                                                         const type = Object.keys(c)[0];
                                                         const details = c[type];
                                                         return (
                                                             <div key={i} className={`flex flex-col p-1.5 rounded-lg border bg-white shadow-sm ${details.componentStatus === 'CONFIRMED' ? 'border-green-100' : 'border-orange-100'}`}>
                                                                 <div className="text-[7px] font-bold text-gray-400 uppercase leading-none mb-0.5">{details.componentType.replace('_', ' ')}</div>
                                                                 <div className={`text-[10px] font-black ${details.componentStatus === 'CONFIRMED' ? 'text-green-700' : 'text-orange-700'}`}>{details.componentName}</div>
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             </div>
                                         )}

                                         {recentSearches.map((r, idx) => (
                                            <li key={`recent-dst-${idx}`} className="p-3 mx-2 rounded-xl hover:bg-gray-50 flex items-center gap-3 cursor-pointer" onClick={() => handleSelectPlace(r, 'destination')}>
                                                <span className="material-icons-round text-gray-400 text-[18px]">history</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-700 truncate">{r.structured_formatting?.main_text || r.description}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{r.description}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {destResults.length > 0 && !isNavigating && (
                                    <ul className="absolute top-[48px] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto z-4000 py-1">
                                        {destResults.map((p) => (
                                            <li key={p.place_id} className="p-3 mx-2 rounded-xl hover:bg-red-50 flex items-center gap-3 cursor-pointer group" onClick={() => handleSelectPlace(p, 'destination')}>
                                                <span className="material-icons-round text-red-600 text-[18px]">location_on</span>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-[13px] font-bold text-gray-900 truncate">{p.structured_formatting?.main_text || p.description}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{p.structured_formatting?.secondary_text || ''}</div>
                                                </div>
                                                <div className="hidden group-hover:flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); savePlace('home', p); }} className="p-1 hover:bg-blue-100 rounded-full text-blue-600" title="Set as Home"><span className="material-icons-round text-sm">home</span></button>
                                                    <button onClick={(e) => { e.stopPropagation(); savePlace('work', p); }} className="p-1 hover:bg-blue-100 rounded-full text-blue-600" title="Set as Work"><span className="material-icons-round text-sm">work</span></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Hazard Alert Overlay */}
                <div
                    className={`absolute top-44 left-4 right-4 bg-red-500/95 text-white border-0 z-1000 max-w-xl mx-auto rounded-[18px] p-4 shadow-xl transform transition-all duration-300 ${alertText ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[-20px] opacity-0 scale-95 pointer-events-none'}`}
                >
                    <div className="flex items-center gap-4">
                        <span className="material-icons-round text-4xl text-white">warning_amber</span>
                        <div>
                            <h3 className="font-bold text-lg mb-0 leading-tight">Safety Alert</h3>
                            <p className="text-[14px] mt-0.5 font-medium opacity-90">{alertText}</p>
                        </div>
                    </div>
                </div>

                {/* Phase 24 & 27: Map Explorer Tooltip (Address + GPS + Elevation) */}
                {clickedLocation && navPhase < 3 && (
                    <div className="absolute top-44 left-4 right-4 z-2000 animate-slide-up max-w-xl mx-auto">
                        <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
                            {/* Decorative Background Element */}
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-icons-round text-6xl">explore</span>
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                        <span className="material-icons-round text-white">place</span>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Map Explorer</div>
                                        <div className="text-[15px] font-black text-gray-900 leading-tight">Pin Dropped</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setClickedLocation(null)}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <span className="material-icons-round text-[18px]">close</span>
                                </button>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1 flex items-center gap-1">
                                        <span className="material-icons-round text-[12px]">location_on</span>
                                        Detected Address
                                    </div>
                                    <div className="text-[13px] font-bold text-gray-700 leading-snug">{clickedLocation.address || 'Resolving address...'}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/50">
                                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tight mb-1 flex items-center gap-1">
                                            <span className="material-icons-round text-[12px]">gps_fixed</span>
                                            Coordinates
                                        </div>
                                        <div className="text-[12px] font-black text-blue-700 font-mono">
                                            {clickedLocation.lat.toFixed(6)}, {clickedLocation.lng.toFixed(6)}
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/50">
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight mb-1 flex items-center gap-1">
                                            <span className="material-icons-round text-[12px]">terrain</span>
                                            Altitude 
                                        </div>
                                        <div className="text-[12px] font-black text-emerald-700 flex items-center gap-1">
                                            {clickedLocation.elevation !== undefined ? (
                                                <span className="animate-pop-in">{clickedLocation.elevation} m <span className="text-[10px] opacity-60">ASL</span></span>
                                            ) : (
                                                <span className="opacity-40 animate-pulse">Calculating...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-2 relative z-10">
                                <button 
                                    onClick={() => {
                                        setDestQuery(clickedLocation.address || `${clickedLocation.lat.toFixed(6)}, ${clickedLocation.lng.toFixed(6)}`);
                                        setSelectedDestination({
                                            name: clickedLocation.address?.split(',')[0] || "Selected Location",
                                            address: clickedLocation.address,
                                            lat: clickedLocation.lat,
                                            lng: clickedLocation.lng,
                                            rating: 0,
                                            status: 'Direct Pin'
                                        });
                                        setClickedLocation(null);
                                    }}
                                    className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-black text-[13px] py-3.5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round text-sm">navigation</span>
                                    GO HERE
                                </button>
                                <button 
                                    onClick={() => fetchStreetView(clickedLocation.lat, clickedLocation.lng)}
                                    disabled={isFetchingStreetView}
                                    className="px-5 bg-white border border-gray-100 text-gray-700 font-bold text-[13px] rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 group"
                                >
                                    <span className={`material-icons-round text-[18px] ${isFetchingStreetView ? 'animate-spin' : ''}`}>
                                        {isFetchingStreetView ? 'sync' : 'streetview'}
                                    </span>
                                    {isFetchingStreetView ? 'Finding...' : 'Look Around'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Map Controls */}
                <div className="absolute right-4 top-44 flex flex-col gap-3 z-1000">
                    <button 
                        className="bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-all active:scale-90"
                        onClick={() => navigateTo('dashboard')}
                        title="Open Dashboard"
                    >
                        <span className="material-icons-round text-2xl">grid_view</span>
                    </button>
                    <button 
                        className={`bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all ${is3D ? 'bg-blue-600 text-white shadow-blue-200' : ''}`}
                        onClick={toggle3D}
                    >
                        <span className="material-icons-round text-2xl">3d_rotation</span>
                    </button>
                    <div className="relative">
                        <button 
                            className={`bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all ${showLayerMenu ? 'bg-orange-600 text-white' : ''}`}
                            onClick={() => setShowLayerMenu(!showLayerMenu)}
                        >
                            <span className="material-icons-round text-2xl">layers</span>
                        </button>
                        {showLayerMenu && (
                            <div className="absolute right-14 top-0 bg-white shadow-2xl rounded-2xl p-2 flex flex-col gap-1 w-48 border border-gray-100 animate-slide-left">
                                <div className="text-[10px] text-gray-400 font-bold px-3 py-1 uppercase tracking-widest">Map Layers</div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {(availableStyles.length > 0 ? availableStyles : [
                                        { id: 'light', name: 'Light (Default)', icon: 'light_mode' },
                                        { id: 'dark', name: 'Dark Mode', icon: 'dark_mode' },
                                        { id: 'satellite', name: 'Satellite View', icon: 'satellite_alt' }
                                    ]).map(s => (
                                        <button 
                                            key={s.id} 
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${mapStyle === s.id ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-gray-50'}`}
                                            onClick={() => { setMapStyle(s.id); setShowLayerMenu(false); }}
                                        >
                                            <span className={`material-icons-round text-xl ${mapStyle === s.id ? 'text-orange-600' : 'text-slate-400'}`}>
                                                {s.icon || (s.name.toLowerCase().includes('dark') ? 'dark_mode' : (s.name.toLowerCase().includes('satellite') ? 'satellite_alt' : 'map'))}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold">{s.name}</span>
                                                <span className="text-[9px] opacity-60 font-medium">Vector Style</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button 
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowHazardsLayer(!showHazardsLayer)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`material-icons-round text-xl ${showHazardsLayer ? 'text-red-500' : 'text-gray-400'}`}>warning</span>
                                        <span className="text-[13px] font-bold text-gray-700">Hazards</span>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${showHazardsLayer ? 'bg-red-500' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showHazardsLayer ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </button>
                                <button 
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                                    onClick={() => setIs3DReality(!is3DReality)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`material-icons-round text-xl ${is3DReality ? 'text-blue-500' : 'text-gray-400'}`}>apartment</span>
                                        <span className="text-[13px] font-bold text-gray-700">3D Reality (Beta)</span>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${is3DReality ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${is3DReality ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button 
                            className={`bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all ${showNearbyMenu ? 'bg-indigo-600 text-white' : ''}`}
                            onClick={() => setShowNearbyMenu(!showNearbyMenu)}
                        >
                            <span className="material-icons-round text-2xl">explore</span>
                        </button>
                        {showNearbyMenu && (
                            <div className="absolute right-14 top-0 bg-white shadow-2xl rounded-2xl p-2 flex flex-col gap-1 w-48 border border-gray-100 animate-slide-left">
                                <div className="text-[10px] text-gray-400 font-bold px-3 py-1 uppercase tracking-widest">Nearby Safety</div>
                                
                                {/* Phase 21: Ranking Toggle */}
                                <div className="px-3 py-2 bg-gray-50/50 flex gap-1 mb-1 rounded-lg mx-1">
                                    <button 
                                        onClick={() => setRankBy('popular')}
                                        className={`flex-1 text-[9px] font-black py-1 rounded-md transition-all ${rankBy === 'popular' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-400'}`}
                                    >POPULAR</button>
                                    <button 
                                        onClick={() => setRankBy('distance')}
                                        className={`flex-1 text-[9px] font-black py-1 rounded-md transition-all ${rankBy === 'distance' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-400'}`}
                                    >NEAREST</button>
                                </div>

                                {[
                                    { id: 'streetview', label: 'Look Around', icon: 'streetview' },
                                    { id: 'hospital', label: 'Hospitals', icon: 'local_hospital' },
                                    { id: 'police', label: 'Police Stations', icon: 'policy' },
                                    { id: 'gas_station', label: 'Charging/Fuel', icon: 'ev_station' }
                                ].map(cat => (
                                    <button 
                                        key={cat.id} 
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                                        onClick={() => {
                                            if (cat.id === 'streetview') showAlert("Look Around (Street View) is experimental and currently optimized for Bengaluru regions.");
                                            else { setNearbyType(cat.id); fetchNearby(cat.id); }
                                        }}
                                    >
                                        <span className="material-icons-round text-indigo-500 text-xl">{cat.icon}</span>
                                        <span className="text-[13px] font-bold text-gray-700">{cat.label}</span>
                                    </button>
                                ))}
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button 
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                                    onClick={fetchDistanceMatrix}
                                >
                                    <span className="material-icons-round text-indigo-500 text-xl">route</span>
                                    <span className="text-[13px] font-bold text-gray-700">Distance Matrix ETAs</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Action / Stats Panel */}
                <div className="absolute bottom-6 left-4 right-4 z-1000 max-w-xl mx-auto flex flex-col gap-3">
                    {navPhase === 3 && routeStats && (
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex justify-around items-center animate-slide-up">
                            <div className="text-center">
                                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Distance</div>
                                <div className="text-xl font-bold text-blue-600">{routeStats.distance}</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div className="text-center">
                                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Duration</div>
                                <div className="text-xl font-bold text-gray-800">{routeStats.duration}</div>
                            </div>
                            {routeElevationProfile && (
                                <>
                                    <div className="w-px h-8 bg-gray-200" />
                                    <div className="text-center">
                                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Climb</div>
                                        <div className="text-[14px] font-black text-emerald-600">+{Math.round(routeElevationProfile.totalAscent)}m</div>
                                    </div>
                                </>
                            )}
                            
                            {currentSpeedLimit && (
                                <>
                                    <div className="w-px h-8 bg-gray-200" />
                                    <div className="flex flex-col items-center">
                                        <div className="w-9 h-9 border-4 border-red-500 rounded-full flex items-center justify-center bg-white shadow-lg">
                                            <span className="text-[14px] font-black text-gray-900">{currentSpeedLimit}</span>
                                        </div>
                                        <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Limit</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Phase 18: Advanced Place Insights Card */}
                    {selectedDestination && navPhase < 3 && (
                        <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 mb-4 animate-slide-up">
                            {/* Phase 30: Comparison Preview (Current Location vs Dest) */}
                            <div className="w-full h-32 rounded-xl mb-3 overflow-hidden border border-blue-100 shadow-inner group relative">
                                <img 
                                    src={generateComparisonPreviewUrl(selectedDestination.lat, selectedDestination.lng, 800, 320)}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    alt="Journey Preview"
                                    loading="lazy"
                                    onError={(e) => {
                                        const cleanStyle = mapStyle.includes('dark') ? 'default-dark-standard' : 'default-light-standard';
                                        e.target.src = `https://api.olamaps.io/tiles/v1/styles/${cleanStyle}/static/${selectedDestination.lng},${selectedDestination.lat},15/800x320.png?api_key=${OLA_MAPS_API_KEY}`;
                                    }}
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-blue-500/20 to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur-md rounded-md text-[8px] font-black text-blue-600 uppercase tracking-widest border border-blue-100 shadow-sm flex items-center gap-1">
                                    <span className="material-icons-round text-[10px]">insights</span>
                                    Journey Comparison
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                                    <div className="w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                                </div>
                            </div>

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-[14px] font-black text-gray-900 leading-tight mb-1">{selectedDestination.name}</div>
                                    <div className="flex items-center gap-2">
                                        {selectedDestination.rating > 0 && (
                                            <span className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5 bg-orange-50 px-1.5 py-0.5 rounded-md">
                                                <span className="material-icons-round text-[10px]">star</span>
                                                {selectedDestination.rating}
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${selectedDestination.status === 'Open Now' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {selectedDestination.status}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedDestination(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                    <span className="material-icons-round text-sm">close</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/60 p-2 rounded-xl border border-white/40 flex items-center gap-2">
                                    <span className={`material-icons-round text-[16px] ${selectedDestination.parking ? 'text-blue-500' : 'text-gray-300'}`}>local_parking</span>
                                    <span className="text-[10px] font-bold text-gray-600">{selectedDestination.parking ? 'Parking' : 'No Parking'}</span>
                                </div>
                                <div className="bg-white/60 p-2 rounded-xl border border-white/40 flex items-center gap-2">
                                    <span className={`material-icons-round text-[16px] ${selectedDestination.accessibility ? 'text-blue-500' : 'text-gray-300'}`}>accessible</span>
                                    <span className="text-[10px] font-bold text-gray-600">{selectedDestination.accessibility ? 'Accessible' : 'No Access Info'}</span>
                                </div>
                            </div>
                            
                            {selectedDestination.weekdayText?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-100/30">
                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 pl-1 text-center">Weekly Schedule</div>
                                    <div className="flex flex-col gap-1">
                                        {selectedDestination.weekdayText.slice(0, 3).map((line, idx) => (
                                            <div key={idx} className="text-[10px] text-gray-500 flex justify-between bg-white/30 px-2 py-1 rounded-md">
                                                <span className="truncate pr-2">{line.split(':')[0]}</span>
                                                <span className="font-bold text-gray-700 shrink-0">{line.split(':')[1]?.trim() || 'Closed'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Phase 22: Global Text Search Results Overlay */}
                    {textSearchResults.length > 0 && navPhase < 3 && (
                        <div className="flex flex-col gap-2 mb-4 animate-slide-up bg-blue-50/80 backdrop-blur-md p-3 rounded-3xl border border-blue-100 shadow-2xl">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <span className="material-icons-round text-[18px] text-white">search</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Global Discovery</div>
                                        <div className="text-[9px] text-blue-400 font-bold uppercase tracking-tight mt-0.5">Explore results across the map</div>
                                    </div>
                                </div>
                                <button onClick={() => setTextSearchResults([])} className="text-[10px] font-black text-blue-600 hover:text-blue-400 uppercase tracking-widest bg-blue-100 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                    <span className="material-icons-round text-sm">close</span>
                                    Close
                                </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                                {textSearchResults.map((p, idx) => (
                                    <div 
                                        key={`text-${idx}`}
                                        onClick={() => {
                                            setDestQuery(p.name);
                                            setSelectedDestination({
                                                ...p,
                                                status: 'Exploring',
                                                rating: p.rating || 0
                                            });
                                            setTextSearchResults([]);
                                            mapInstanceRef.current.flyTo({ center: [p.lng, p.lat], zoom: 16 });
                                        }}
                                        className="min-w-[200px] p-4 rounded-2xl bg-white border border-blue-100 shadow-lg hover:border-blue-500 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <span className="material-icons-round text-4xl">travel_explore</span>
                                        </div>
                                        <div className="text-[14px] font-black text-gray-900 truncate mb-1 group-hover:text-blue-600 transition-colors">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 line-clamp-2 leading-tight h-8 opacity-70 mb-3">{p.address}</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                <span className="material-icons-round text-[12px]">place</span>
                                                GO TO
                                            </div>
                                            {p.types?.[0] && (
                                                <span className="text-[8px] font-bold text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded-md">{p.types[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phase 21: Discovery Results Tray */}
                    {navPhase < 3 && nearbyResults.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2 animate-slide-up bg-black/5 backdrop-blur-md p-3 rounded-3xl border border-white/10">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nearby {nearbyType}s</div>
                                </div>
                                <button onClick={() => setNearbyResults([])} className="text-[10px] font-black text-indigo-600 hover:text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg transition-colors">Clear</button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {nearbyResults.map((p, idx) => (
                                    <div 
                                        key={`nearby-${idx}`}
                                        onClick={() => {
                                            mapInstanceRef.current.flyTo({ center: [p.geometry.location.lng, p.geometry.location.lat], zoom: 16 });
                                        }}
                                        className="min-w-[160px] p-3 rounded-2xl bg-white border border-gray-100 shadow-lg hover:border-indigo-500 transition-all cursor-pointer group"
                                    >
                                        <div className="relative mb-2">
                                            {p.photo ? (
                                                <img src={p.photo} className="w-full h-24 object-cover rounded-xl border border-black/5" alt={p.name} />
                                            ) : (
                                                <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                                                    <span className="material-icons-round text-gray-300 text-3xl">image_not_supported</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[13px] font-black text-gray-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {p.rating && <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                <span className="material-icons-round text-[10px]">star</span>
                                                {p.rating}
                                            </span>}
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${p.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {p.openNow ? 'OPEN' : 'CLOSED'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate opacity-70 leading-tight">{p.address}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {navPhase === 2 && alternativeRoutes.length > 0 && (
                        <div className="flex flex-col gap-2 mb-4 animate-slide-up">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Recommended Routes</div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {alternativeRoutes.map((route, idx) => (
                                    <div 
                                        key={`route-${idx}`}
                                        onClick={() => {
                                            setSelectedRouteIndex(idx);
                                            setRouteStats({ distance: route.distance, duration: route.duration });
                                            // Update map source
                                            if (mapInstanceRef.current.getSource('route')) {
                                                mapInstanceRef.current.getSource('route').setData({
                                                    type: 'Feature',
                                                    properties: { color: route.isSafest ? '#059669' : '#3b82f6' },
                                                    geometry: { type: 'LineString', coordinates: route.coordinates }
                                                });
                                            }
                                        }}
                                        className={`min-w-[140px] p-3 rounded-2xl border-2 transition-all cursor-pointer ${selectedRouteIndex === idx ? 'bg-white border-blue-500 shadow-lg' : 'bg-white/60 border-transparent text-gray-500'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[14px] font-bold ${selectedRouteIndex === idx ? 'text-blue-600' : 'text-gray-900'}`}>{route.duration}</span>
                                            {route.isSafest && <span className="bg-green-100 text-green-700 text-[8px] px-1.5 py-0.5 rounded-md font-black">🛡️ SAFEST</span>}
                                            {!route.isSafest && route.isFastest && <span className="bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.5 rounded-md font-black">⚡ FASTEST</span>}
                                        </div>
                                        <div className={`text-[10px] font-bold mb-2 ${selectedRouteIndex === idx ? 'text-blue-400' : 'text-gray-400'}`}>{route.distance}</div>
                                        <div className={`flex items-center gap-1 text-[9px] font-bold ${selectedRouteIndex === idx ? 'text-orange-500' : 'text-gray-400'}`}>
                                            <span className="material-icons-round text-[12px]">warning</span>
                                            {Math.ceil(route.safetyScore)} Hazards
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stage 3: Preferences & Mode (Consolidated here) */}
                    {navPhase === 2 && alternativeRoutes.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end animate-pop-in mb-2">
                            <div className="flex bg-white/90 backdrop-blur-md rounded-full border border-white/20 shadow-md p-1">
                                {[
                                    { id: 'fastest', label: 'Fastest', icon: 'speed' },
                                    { id: 'shortest', label: 'Shortest', icon: 'straighten' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setRoutePreference(p.id)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all ${routePreference === p.id ? 'bg-indigo-600 text-white shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <span className="material-icons-round text-[12px]">{p.icon}</span>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 text-gray-600">
                                {[
                                    { id: 'driving', icon: 'directions_car', label: 'Car' },
                                    { id: 'cycling', icon: 'motorcycle', label: 'Bike' },
                                    { id: 'walking', icon: 'directions_walk', label: 'Walk' }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all shadow-md shrink-0 border border-white/20 ${travelMode === mode.id ? 'bg-blue-600 text-white' : 'bg-white/90 backdrop-blur-md'}`}
                                        onClick={() => setTravelMode(mode.id)}
                                    >
                                        <span className="material-icons-round text-sm">{mode.icon}</span>
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {navPhase < 3 ? (
                        <button
                            className={`w-full p-[18px] rounded-2xl font-bold flex items-center justify-center gap-3 text-[17px] shadow-xl outline-none transition-all active:scale-[0.98] ${navPhase >= 1 ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:shadow-2xl hover:brightness-110' : 'bg-white/80 text-gray-400 shadow-md cursor-not-allowed'}`}
                            onClick={() => {
                                if (navPhase === 1) calculateRoutes();
                                else if (navPhase >= 2) startNavigation();
                            }}
                        >
                            <span className="material-icons-round text-[24px]">
                                {navPhase === 1 ? 'route' : 'explore'}
                            </span>
                            {navPhase === 0 ? 'Choose route above' : (navPhase === 1 ? 'Get Directions' : 'Start Navigating')}
                        </button>
                    ) : (
                        <button
                            className="w-full p-[18px] rounded-2xl bg-red-500/90 backdrop-blur-md border border-red-400 text-white flex items-center justify-center gap-2 font-bold text-[17px] shadow-xl hover:bg-red-600 transition-all active:scale-[0.98]"
                            onClick={endNavigation}
                        >
                            <span className="material-icons-round text-[22px]">close</span>
                            End Navigation
                        </button>
                    )}
                </div>

                {/* Phase 31: Street View Panorama Modal */}
                {streetViewImage && (
                    <div className="absolute inset-0 z-5000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20 relative animate-pop-in">
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <button 
                                    onClick={() => setStreetViewImage(null)}
                                    className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg"
                                >
                                    <span className="material-icons-round">close</span>
                                </button>
                            </div>

                            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                                <img 
                                    src={streetViewImage.url} 
                                    className="w-full h-full object-cover animate-pan-image" 
                                    alt="Street View" 
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20 pointer-events-none"></div>
                                
                                {/* Bearing Indicator */}
                                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                                        <div 
                                            className="w-1 h-6 bg-red-500 rounded-full transition-transform duration-1000"
                                            style={{ transform: `rotate(${streetViewImage.bearing}deg)` }}
                                        ></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Bearing</span>
                                        <span className="text-[16px] font-black text-white">{streetViewImage.bearing}° {
                                            streetViewImage.bearing < 45 || streetViewImage.bearing > 315 ? 'North' :
                                            streetViewImage.bearing < 135 ? 'East' :
                                            streetViewImage.bearing < 225 ? 'South' : 'West'
                                        }</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <span className="material-icons-round text-white">visibility</span>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Immersive Preview</div>
                                        <div className="text-[18px] font-black text-gray-900">Look Around Success</div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                            <span className="material-icons-round text-indigo-500 text-sm">gps_fixed</span>
                                        </div>
                                        <span className="text-[12px] font-black text-gray-700 font-mono">
                                            {streetViewImage.lat.toFixed(6)}, {streetViewImage.lng.toFixed(6)}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const link = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewImage.lat},${streetViewImage.lng}`;
                                            window.open(link, '_blank');
                                        }}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                    >
                                        <span className="material-icons-round text-sm">open_in_new</span>
                                        Interactive View
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Global style for map popup to have rounded corners and modern font */}
            <style>{`
                .hazard-popup .maplibregl-popup-content {
                    border-radius: 12px;
                    padding: 8px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .hazard-popup .maplibregl-popup-tip {
                    border-top-color: #fff;
                }
            `}</style>
            <style>{`
                @keyframes pulsing {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .pulsing-hazard {
                    animation: pulsing 1.5s ease-in-out infinite;
                }
                .user-marker-icon {
                    box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2);
                    animation: pulse-user 2s infinite;
                }
                @keyframes pulse-user {
                    0% { box-shadow: 0 0 0 0 rgba(33, 150, 150, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(33, 150, 150, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(33, 150, 150, 0); }
                }
                @keyframes slide-left {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slide-right {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-left {
                    animation: slide-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .animate-slide-right {
                    animation: slide-right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .animate-slide-up {
                    animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0,0,0,0.1);
                }
                @keyframes pan-image {
                    0% { transform: scale(1.1) translateX(-2%); }
                    50% { transform: scale(1.1) translateX(2%); }
                    100% { transform: scale(1.1) translateX(-2%); }
                }
                .animate-pan-image {
                    animation: pan-image 20s ease-in-out infinite;
                }
                @keyframes pop-in {
                    0% { transform: scale(0.9) translateY(20px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-pop-in {
                    animation: pop-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>
        </section>
    );
};

export default MapScreen;
