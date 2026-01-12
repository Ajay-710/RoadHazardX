import React, { useState, useRef, useEffect } from 'react';

const ReportScreen = ({ isActive, navigateTo, currentUserLocation, onSubmit }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [hazardType, setHazardType] = useState('');
    const [mockMode, setMockMode] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!isActive) {
            stopCamera();
        }
    }, [isActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const initCamera = async (e) => {
        if (e.target.id === 'camera-feed' || e.target.closest('.capture-btn-overlay')) return;

        if (photoPreview) setPhotoPreview(null);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setCameraActive(true);
                setMockMode(false);
            } catch (err) {
                console.warn("Camera access failed, enabling mock mode.", err);
                enableMockMode();
            }
        } else {
            enableMockMode();
        }
    };

    const enableMockMode = () => {
        setMockMode(true);
        setCameraActive(true);
    };

    const capturePhoto = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;
        if (!mockMode && (!streamRef.current || !videoRef.current)) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (mockMode) {
            canvas.width = 640;
            canvas.height = 480;
            ctx.fillStyle = "#555";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ccc";
            ctx.font = "30px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Mock Hazard Photo", canvas.width / 2, canvas.height / 2);
        } else {
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
        }

        let locationText = "Loc: Waiting for GPS...";
        if (currentUserLocation) {
            locationText = `Lat: ${currentUserLocation.lat.toFixed(6)}, Lng: ${currentUserLocation.lng.toFixed(6)}`;
        }
        const timeText = new Date().toLocaleString();

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("RoadHazeX Hazard Report", 20, canvas.height - 35);
        ctx.font = "14px sans-serif";
        ctx.fillText(`${timeText} | ${locationText}`, 20, canvas.height - 15);

        setPhotoPreview(canvas.toDataURL('image/png'));
        stopCamera();
    };

    const handleSubmit = () => {
        onSubmit(hazardType, photoPreview);
    };

    if (!isActive) return null;

    return (
        <section className="absolute inset-0 flex flex-col bg-bg-gradient z-10 animate-fade-in overflow-y-auto">
            <div className="flex items-center gap-4 p-6">
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" onClick={() => navigateTo('home')}>
                    <span className="material-icons-round text-white">arrow_back</span>
                </button>
                <h2 className="text-2xl font-bold text-white">Report Hazard</h2>
            </div>

            <div className="glass-panel mx-4 p-6 rounded-3xl mb-8 max-w-xl self-center w-full">
                <div
                    className="border-2 border-dashed border-white/20 rounded-2xl h-64 flex flex-col items-center justify-center mb-6 text-gray-300 cursor-pointer relative overflow-hidden bg-black/20 hover:bg-black/30 transition-colors"
                    onClick={initCamera}
                >
                    {!cameraActive && !photoPreview && (
                        <div className="flex flex-col items-center">
                            <span className="material-icons-round text-5xl mb-2">photo_camera</span>
                            <p>Tap to Open Camera</p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        id="camera-feed"
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover rounded-xl ${cameraActive && !photoPreview && !mockMode ? 'block' : 'hidden'}`}
                    ></video>

                    {cameraActive && mockMode && !photoPreview && (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl">
                            <p>Mock Camera Active</p>
                        </div>
                    )}

                    {cameraActive && !photoPreview && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/80 rounded-full border-4 border-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-transform z-20 capture-btn-overlay" onClick={capturePhoto}>
                            <div className="w-12 h-12 bg-transparent border-2 border-gray-800 rounded-full"></div>
                        </div>
                    )}

                    <canvas ref={canvasRef} id="photo-canvas" className="hidden"></canvas>

                    {photoPreview && (
                        <img
                            src={photoPreview}
                            className="w-full h-full object-cover rounded-xl block"
                        />
                    )}
                </div>

                <div className="mb-5 text-left">
                    <label className="block mb-2 text-gray-300 text-sm">Hazard Type</label>
                    <select
                        className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white text-base focus:outline-none focus:border-primary/50 [&>optgroup]:bg-gray-800 [&>option]:bg-gray-800 cursor-pointer"
                        value={hazardType}
                        onChange={(e) => setHazardType(e.target.value)}
                    >
                        <option value="" disabled>Select Hazard Type</option>
                        <option value="" disabled>--- ROAD HAZARDS CATEGORY 🚦 ---</option>

                        <optgroup label="1. Road Infrastructure Hazards">
                            <option value="Potholes">Potholes</option>
                            <option value="Road Cracks">Road cracks</option>
                            <option value="Uneven Roads">Uneven roads</option>
                            <option value="Damaged Manholes">Damaged manholes</option>
                            <option value="Road Subsidence">Road subsidence</option>
                        </optgroup>

                        <optgroup label="2. Traffic System Hazards">
                            <option value="Non-functioning Traffic Signal">Non-functioning traffic signals</option>
                            <option value="Broken/Bent Traffic Sign">Broken or bent traffic signs</option>
                            <option value="Non-working Street Light">Non-working street lights</option>
                            <option value="Missing Signboard">Missing signboards</option>
                            <option value="Improper Barricade">Improperly placed barricades</option>
                        </optgroup>

                        <optgroup label="3. Environmental Hazards">
                            <option value="Fallen Tree/Branch">Fallen trees or branches</option>
                            <option value="Debris">Debris on road</option>
                        </optgroup>

                        <optgroup label="4. Emergency Hazards">
                            <option value="Accident">Road accidents</option>
                            <option value="Fire Incident">Fire incidents</option>
                            <option value="Medical Emergency">Medical emergencies on road</option>
                            <option value="Fuel Spill">Fuel spills</option>
                        </optgroup>

                        <optgroup label="5. Climatic Hazards">
                            <option value="Waterlogging/Flood">Waterlogging / flooded roads</option>
                            <option value="Low Visibility">Low visibility zones</option>
                        </optgroup>
                    </select>
                </div>

                <div className="mb-6 text-left">
                    <label className="block mb-2 text-gray-300 text-sm">Location</label>
                    <div className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-green-400 text-base flex items-center gap-2">
                        <span className="material-icons-round">my_location</span>
                        <span>
                            {currentUserLocation
                                ? `${currentUserLocation.lat.toFixed(4)}, ${currentUserLocation.lng.toFixed(4)}`
                                : "Browsing Location... (Auto-detected)"}
                        </span>
                    </div>
                </div>

                <button
                    className="w-full p-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                    onClick={handleSubmit}
                >
                    Submit Report
                </button>
            </div>
        </section>
    );
};

export default ReportScreen;
