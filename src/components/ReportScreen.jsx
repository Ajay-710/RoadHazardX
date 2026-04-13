import React, { useState, useRef, useEffect } from 'react';
import { Globe } from './ui/Globe';
import { 
    Construction, 
    TrafficEvent, 
    Tree, 
    WarningAlt, 
    Cloud, 
    CheckmarkFilled,
    ChevronDown,
    ChevronUp
} from '@carbon/icons-react';

/* ─── Animated background canvas ─── */
function RoadBg() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let W = 0, H = 0;
        const particles = [];
        const ripples = [];
        let mouse = { x: -999, y: -999 };
        let offset = 0;

        const resize = () => {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Mouse move → spawn ripple
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            if (Math.random() < 0.06) {
                ripples.push({ x: mouse.x, y: mouse.y, r: 0, alpha: 0.45 });
            }
        };
        canvas.addEventListener('mousemove', onMouseMove);

        // Spawn floating hazard particles
        for (let i = 0; i < 70; i++) {
            particles.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                r: Math.random() * 2.2 + 0.5,
                dx: (Math.random() - 0.5) * 0.35,
                dy: -(Math.random() * 0.55 + 0.15),
                alpha: Math.random() * 0.55 + 0.15,
                hue: Math.random() < 0.5 ? 0 : 30, // red or orange
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            /* ── Background gradient ── */
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0d1b3e');
            bg.addColorStop(0.45, '#1e3c72');
            bg.addColorStop(1, '#0a0f2c');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            /* ── Road (perspective trapezoid) ── */
            const roadW = W * 0.58;
            const vanishX = W / 2;
            const vanishY = H * 0.36;
            const leftBottom = W / 2 - roadW / 2;
            const rightBottom = W / 2 + roadW / 2;

            const roadGrad = ctx.createLinearGradient(vanishX, vanishY, vanishX, H);
            roadGrad.addColorStop(0, 'rgba(40,60,110,0)');
            roadGrad.addColorStop(0.3, 'rgba(20,38,80,0.5)');
            roadGrad.addColorStop(1, 'rgba(12,22,60,0.85)');

            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(leftBottom, H);
            ctx.lineTo(rightBottom, H);
            ctx.closePath();
            ctx.fillStyle = roadGrad;
            ctx.fill();

            /* ── Edge lines ── */
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(vanishX - 4, vanishY); ctx.lineTo(leftBottom, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vanishX + 4, vanishY); ctx.lineTo(rightBottom, H); ctx.stroke();

            /* ── Moving dashed centre line ── */
            const dashCount = 14;
            ctx.setLineDash([16, 16]);
            ctx.lineDashOffset = -offset;
            for (let i = 0; i < dashCount; i++) {
                const t = i / dashCount;
                const y = vanishY + (H - vanishY) * t;
                const endY = vanishY + (H - vanishY) * ((i + 1) / dashCount);
                const scale = 0.35 + t * 0.65;
                ctx.lineWidth = 2.5 * scale;
                ctx.strokeStyle = `rgba(255,200,80,${0.5 * scale + 0.15})`;
                ctx.beginPath(); ctx.moveTo(vanishX, y); ctx.lineTo(vanishX, endY); ctx.stroke();
            }
            ctx.setLineDash([]);

            /* ── Horizon glow ── */
            const glowGrad = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, H * 0.5);
            glowGrad.addColorStop(0, 'rgba(255,107,107,0.14)');
            glowGrad.addColorStop(0.5, 'rgba(255,142,83,0.06)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, W, H);

            /* ── Mouse proximity glow ── */
            if (mouse.x > 0) {
                const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
                mg.addColorStop(0, 'rgba(255,107,107,0.10)');
                mg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = mg;
                ctx.fillRect(0, 0, W, H);
            }

            /* ── Ripples ── */
            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i];
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,107,107,${rp.alpha})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
                rp.r += 2.5;
                rp.alpha -= 0.018;
                if (rp.alpha <= 0) ripples.splice(i, 1);
            }

            /* ── Floating particles ── */
            particles.forEach(p => {
                // resize-safe: reset to canvas dims lazily
                if (p.x > W) p.x = Math.random() * W;
                if (p.y > H) p.y = Math.random() * H;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
                gr.addColorStop(0, p.hue === 0 ? 'rgba(255,107,107,0.95)' : 'rgba(255,142,83,0.95)');
                gr.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gr;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                p.x += p.dx;
                p.y += p.dy;
                if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
            });

            offset = (offset + 1.6) % 32;
            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'auto',
                zIndex: 0,
            }}
        />
    );
}

// --- CONFIGURATION ---
const LOCAL_API_URL = "http://127.0.0.1:5000/predict"; 
const HF_SPACE_URL = "https://vijaydevaraj-vlm-clip-model.hf.space/predict"; 
// ---------------------

const ReportScreen = ({ isActive, navigateTo, currentUserLocation, onSubmit }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [hazardType, setHazardType] = useState('');
    const [mockMode, setMockMode] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [forceSubmitAllowed, setForceSubmitAllowed] = useState(false);
    const [cameraHovered, setCameraHovered] = useState(false);
    const [submitHovered, setSubmitHovered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState(null);

    const HAZARD_CATEGORIES = [
        {
            id: 'infra',
            label: 'Road Infrastructure',
            icon: Construction,
            items: ['Pothole', 'Unrepaired/Damaged Manhole', 'Broken Road Surface']
        },
        {
            id: 'traffic',
            label: 'Traffic System',
            icon: TrafficEvent,
            items: ['Traffic Signal Issue', 'Traffic Sign Damage', 'Streetlight Not Working', 'Missing Signboard', 'Improper Barricade']
        },
        {
            id: 'env',
            label: 'Environmental',
            icon: Tree,
            items: ['Tree Obstruction', 'Debris on Road']
        },
        {
            id: 'emergency',
            label: 'Emergency',
            icon: WarningAlt,
            items: ['Road Accident', 'Vehicle Breakdown']
        },
        {
            id: 'climatic',
            label: 'Climatic',
            icon: Cloud,
            items: ['Waterlogging', 'Low Visibility']
        }
    ];

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Stop camera when screen deactivated
    useEffect(() => {
        if (!isActive) stopCamera();
    }, [isActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const openCamera = async () => {
        if (photoPreview) setPhotoPreview(null);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                streamRef.current = stream;
                setMockMode(false);
                setCameraActive(true);
            } catch (err) {
                console.warn('Camera access failed, enabling mock mode.', err);
                setMockMode(true);
                setCameraActive(true);
            }
        } else {
            setMockMode(true);
            setCameraActive(true);
        }
    };

    useEffect(() => {
        if (cameraActive && !mockMode && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err =>
                console.warn('video.play() failed:', err)
            );
        }
    }, [cameraActive, mockMode]);

    const capturePhoto = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (mockMode) {
            canvas.width = 640;
            canvas.height = 480;
            ctx.fillStyle = '#444';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#aaa';
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Mock Hazard Photo', canvas.width / 2, canvas.height / 2);
        } else {
            if (!videoRef.current || !streamRef.current) return;
            const video = videoRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const locationText = currentUserLocation
            ? `Lat: ${currentUserLocation.lat.toFixed(6)}, Lng: ${currentUserLocation.lng.toFixed(6)}`
            : 'Loc: Waiting for GPS...';
        const timeText = new Date().toLocaleString();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('RoadHazeX Hazard Report', 20, canvas.height - 35);
        ctx.font = '14px sans-serif';
        ctx.fillText(`${timeText} | ${locationText}`, 20, canvas.height - 15);

        const base64Image = canvas.toDataURL('image/png');
        setPhotoPreview(base64Image);
        setValidationError('');
        setForceSubmitAllowed(false);
        stopCamera();
    };

    const handleSubmit = async () => {
        if (!currentUserLocation) {
            setValidationError('GPS is required to submit a report. Please enable your location services.');
            return;
        }
        if (!photoPreview && !hazardType) {
            setValidationError('Please capture a photo and select a hazard type before submitting.');
            return;
        }
        if (!photoPreview) {
            setValidationError('Please capture a photo of the hazard first.');
            return;
        }
        if (!hazardType) {
            setValidationError('Please select a hazard type before submitting.');
            return;
        }
        
        if (forceSubmitAllowed) {
            const pd = window._pendingHazardData || {};
            onSubmit(
                pd.type || hazardType, 
                pd.img || photoPreview, 
                pd.conf || 0.0, 
                pd.status || 'Mismatch', 
                pd.addr || 'Manual Report'
            );
            return;
        }
        
        setValidationError('');
        setIsProcessing(true);
        
        try {
            const res = await fetch(photoPreview);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('image', blob, 'capture.png');
            formData.append('hazard', hazardType); // Send user's selection for backend validation

            const headers = {};
            const hfToken = import.meta.env.VITE_HF_TOKEN;
            if (hfToken && hfToken !== 'hf_your_token_here') {
                headers['Authorization'] = `Bearer ${hfToken}`;
            }

            const isHttps = window.location.protocol === 'https:';
            const isLocalInsecure = LOCAL_API_URL.startsWith('http://') && !LOCAL_API_URL.includes('https://');

            let apiRes;
            if (isHttps && isLocalInsecure) {
                // Browsers block HTTPS -> HTTP. Skip local and use cloud.
                console.info("Hosted HTTPS environment detected. Using Hugging Face cloud AI for security.");
                apiRes = await fetch(HF_SPACE_URL, {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });
            } else {
                // Try local first, then fallback
                try {
                    apiRes = await fetch(LOCAL_API_URL, {
                        method: 'POST',
                        headers: headers,
                        body: formData
                    });
                } catch (err) {
                    console.warn("Local AI unreachable, falling back to Hugging Face cloud.", err);
                    apiRes = await fetch(HF_SPACE_URL, {
                        method: 'POST',
                        headers: headers,
                        body: formData
                    });
                }
            }
            
            if (!apiRes.ok) {
                throw new Error(`AI Gateway error: ${apiRes.status} ${apiRes.statusText}`);
            }
            const data = await apiRes.json();

            // --- Geocoding for readable address ---
            let readableAddress = "Unknown Location";
            try {
                const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
                const lat = currentUserLocation?.lat || 12.9716;
                const lng = currentUserLocation?.lng || 77.5946;
                
                const geoRes = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
                const geoData = await geoRes.json();
                if (geoData.results?.[0]) {
                    readableAddress = geoData.results[0].formatted_address;
                }
            } catch (err) {
                console.warn("Reverse Geocoding failed:", err);
            }

            if (data.prediction) {
                const aiStatus = data.status === true ? 'Verified' : 'Mismatch';
                
                if (data.status === true) {
                    onSubmit(hazardType, photoPreview, data.confidence, aiStatus, readableAddress);
                } else {
                    const msg = `AI processing: You selected "${hazardType}" and AI predicted "${data.prediction}", Are you sure?`;
                    setValidationError(msg);
                    setForceSubmitAllowed(true);
                    
                    window._pendingHazardData = { 
                        type: hazardType, 
                        img: photoPreview, 
                        conf: data.confidence, 
                        status: aiStatus, 
                        addr: readableAddress 
                    };
                }
            } else if (data.error) {
                setValidationError("AI Error: " + data.error);
                setForceSubmitAllowed(true);
                window._pendingHazardData = { 
                    type: hazardType, 
                    img: photoPreview, 
                    conf: 0, 
                    status: 'Pending', 
                    addr: readableAddress 
                };
            }
        } catch (err) {
            console.error("AI Error:", err);
            setValidationError("AI processing unreachable. You can still 'Submit' to manually report.");
            setForceSubmitAllowed(true);
            
            window._pendingHazardData = { 
                type: hazardType, 
                img: photoPreview, 
                conf: 0, 
                status: 'Unreachable', 
                addr: 'GPS Location Source' 
            };
        } finally {
            setIsProcessing(false);
        }
    };

    const isReady = photoPreview && hazardType && !isProcessing && currentUserLocation;

    if (!isActive) return null;

    return (
        <>
            {/* ── Full-screen camera overlay ── */}
            {cameraActive && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: '#000',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <button
                        onClick={stopCamera}
                        aria-label="Close camera"
                        style={{
                            position: 'absolute', top: '1rem', left: '1rem',
                            zIndex: 10001,
                            background: 'rgba(0,0,0,0.6)', border: 'none',
                            borderRadius: '50%', width: '2.75rem', height: '2.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(6px)',
                        }}
                    >
                        <span className="material-icons-round" style={{ color: '#fff', fontSize: '1.4rem' }}>close</span>
                    </button>

                    {!mockMode ? (
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            background: '#1a1a1a', color: '#888', gap: '0.75rem',
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '3.5rem', color: '#555' }}>videocam_off</span>
                            <span style={{ fontSize: '1rem' }}>Camera unavailable — tap shutter for mock photo</span>
                        </div>
                    )}

                    <button
                        onClick={capturePhoto}
                        style={{
                            position: 'absolute', bottom: '2.5rem',
                            left: '50%', transform: 'translateX(-50%)',
                            width: '5rem', height: '5rem', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)',
                            border: '4px solid #fff',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10001,
                            transition: 'transform 0.1s',
                        }}
                    >
                        <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', border: '2.5px solid #333' }} />
                    </button>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            {/* ── Report form ── */}
            <section className="absolute inset-0 z-10 animate-fade-in flex items-center justify-center p-4 lg:p-8 overflow-y-auto no-scrollbar bg-[#020617] lg:overflow-hidden">
                
                <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] animate-gradient" style={{ background: 'var(--background-image-primary-gradient)' }} />

                <div className="w-full max-w-6xl rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl overflow-hidden relative shadow-2xl flex flex-col lg:flex-row max-h-[95vh] lg:h-[800px]">
                    
                    <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                    <div className="flex-1 flex flex-col p-6 md:p-10 relative z-10 overflow-y-auto no-scrollbar scroll-smooth">
                        
                        <div className="flex items-center justify-between mb-8 sticky top-0 bg-transparent z-20 pb-2">
                             <div className="flex items-center gap-4">
                                <button
                                    className="p-2.5 rounded-full transition-all duration-300 bg-white/5 border border-white/10 backdrop-blur-md hover:bg-red-500/20 hover:border-red-500/40 active:scale-90 group"
                                    onClick={() => navigateTo('home')}
                                >
                                    <span className="material-icons-round text-white transition-transform group-hover:-translate-x-1">arrow_back</span>
                                </button>
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center shadow-lg" style={{ background: 'var(--background-image-primary-gradient)' }}>
                                         <span className="material-icons-round text-white text-lg">warning</span>
                                     </div>
                                     <h2 className="text-2xl font-bold text-white tracking-tight">Report Hazard</h2>
                                </div>
                             </div>
                             
                             <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[10px] font-bold text-neutral-300 uppercase tracking-widest backdrop-blur-xl">
                                <span className={`size-2 rounded-full animate-pulse shadow-sm ${currentUserLocation ? "bg-emerald-400" : "bg-amber-400"}`} />
                                {currentUserLocation ? "GPS Active" : "Searching Location"}
                             </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Camera Area */}
                            <div
                                onClick={openCamera}
                                onMouseEnter={() => setCameraHovered(true)}
                                onMouseLeave={() => setCameraHovered(false)}
                                className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 h-64 flex items-center justify-center cursor-pointer overflow-hidden ${
                                    cameraHovered ? 'border-primary/50 bg-primary/10 scale-[1.01]' : 'border-white/20 bg-black/20'
                                }`}
                            >
                                {!photoPreview ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${cameraHovered ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-white/10'}`}>
                                            <span className="material-icons-round text-3xl text-white">photo_camera</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-neutral-200">Tap to Open Camera</p>
                                            <p className="text-xs text-neutral-500">Capture the road hazard</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <img src={photoPreview} className="w-full h-full object-cover" alt="Hazard" />
                                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${cameraHovered ? 'opacity-100' : 'opacity-0'}`}>
                                            <div className="bg-primary/20 border border-primary/50 rounded-full px-5 py-2 backdrop-blur-md flex items-center gap-2">
                                                <span className="material-icons-round text-white">refresh</span>
                                                <span className="text-white text-sm font-bold">Retake</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Hazard Classification UI */}
                            <div className="group">
                                <label className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-primary transition-colors">
                                     <div className="size-1.5 rounded-full bg-primary shadow-sm" />
                                     Hazard Classification
                                </label>
                                
                                <div className="flex flex-col gap-3">
                                    {HAZARD_CATEGORIES.map((cat) => (
                                        <div key={cat.id} className="flex flex-col">
                                            <button 
                                                onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                    expandedCategory === cat.id || cat.items.includes(hazardType)
                                                    ? 'bg-white/10 border-white/20 shadow-lg' 
                                                    : 'bg-white/5 border-white/5 hover:bg-white/8'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl transition-all ${cat.items.includes(hazardType) ? 'bg-primary/20 text-primary' : 'bg-white/5 text-neutral-500'}`}>
                                                        <cat.icon size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-sm font-bold ${cat.items.includes(hazardType) ? 'text-white' : 'text-neutral-400'}`}>{cat.label}</p>
                                                        {cat.items.includes(hazardType) && (
                                                            <p className="text-[10px] text-primary/80 font-bold uppercase tracking-tighter">{hazardType}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {expandedCategory === cat.id ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
                                            </button>

                                            <div className={`overflow-hidden transition-all duration-300 ${expandedCategory === cat.id ? 'max-h-96 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="grid grid-cols-1 gap-1.5 p-2 bg-black/30 rounded-2xl border border-white/5 mx-2">
                                                    {cat.items.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => { setHazardType(opt); setExpandedCategory(null); setValidationError(''); }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${hazardType === opt ? 'bg-primary/20 border border-primary/30 text-white' : 'hover:bg-white/5 text-neutral-500'}`}
                                                        >
                                                            <div className={`size-1.5 rounded-full ${hazardType === opt ? 'bg-primary' : 'bg-white/20'}`} />
                                                            <span className="text-[13px] font-medium">{opt}</span>
                                                            {hazardType === opt && <CheckmarkFilled size={16} className="ml-auto text-emerald-400" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                                     <span className="material-icons-round text-primary text-sm">location_on</span>
                                     Geo-Positioning
                                </label>
                                <div className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${currentUserLocation ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                    <div className={`p-2 rounded-full ${currentUserLocation ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <span className="material-icons-round text-lg">{currentUserLocation ? 'my_location' : 'location_off'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${currentUserLocation ? 'text-white' : 'text-amber-500'}`}>
                                            {currentUserLocation ? 'Location Locked' : 'GPS Signal Required'}
                                        </p>
                                        <p className="text-[11px] text-neutral-500 font-medium">
                                            {currentUserLocation ? `${currentUserLocation.lat.toFixed(6)}, ${currentUserLocation.lng.toFixed(6)}` : 'Scanning for satellites...'}
                                        </p>
                                    </div>
                                    {currentUserLocation && <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
                                </div>
                            </div>

                            {/* Error Message */}
                            {validationError && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-shake">
                                    <span className="material-icons-round text-red-500 text-lg">error_outline</span>
                                    <p className="text-xs text-red-400 leading-relaxed font-medium">{validationError}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                onMouseEnter={() => setSubmitHovered(true)}
                                onMouseLeave={() => setSubmitHovered(false)}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                                    isReady 
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95' 
                                    : 'bg-white/5 border border-white/5 text-neutral-600 cursor-not-allowed'
                                }`}
                            >
                                {isProcessing ? (
                                    <span className="material-icons-round animate-spin">autorenew</span>
                                ) : (
                                    <span className="material-icons-round">{isReady ? 'send' : 'lock'}</span>
                                )}
                                {isProcessing ? 'AI Processing...' : forceSubmitAllowed ? 'Confirm Manual Submission' : 'Submit Hazard Report'}
                            </button>

                            {/* Progress Indicators */}
                            <div className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                <span className={`flex items-center gap-1.5 ${photoPreview ? 'text-emerald-400' : 'text-neutral-600'}`}>
                                    <CheckmarkFilled size={12} /> Photo
                                </span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`flex items-center gap-1.5 ${hazardType ? 'text-emerald-400' : 'text-neutral-600'}`}>
                                    <CheckmarkFilled size={12} /> Classification
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 hidden lg:flex items-center justify-center p-8 bg-black/20 border-l border-white/5 relative">
                         <div className="absolute top-10 left-10 py-1.5 px-4 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 backdrop-blur-md">
                            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Global Edge Node</span>
                         </div>
                         <div className="w-full h-full flex items-center justify-center transition-transform hover:scale-[1.02]">
                            <Globe size={460} />
                         </div>
                    </div>
                </div>
            </section>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
            `}</style>
        </>
    );
};

export default ReportScreen;
