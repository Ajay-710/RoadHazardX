import React, { useEffect, useRef } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

/* ─── Animated canvas: road & particle effect ─── */
function RoadCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        let W = 0, H = 0;

        const resize = () => {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Floating particles
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 2.5 + 0.5,
                dx: (Math.random() - 0.5) * 0.4,
                dy: -(Math.random() * 0.6 + 0.2),
                alpha: Math.random() * 0.6 + 0.2,
            });
        }

        let offset = 0;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            // Dark gradient background
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0d1b3e');
            bg.addColorStop(0.5, '#1e3c72');
            bg.addColorStop(1, '#0a0f2c');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Road (perspective)
            const roadW = W * 0.55;
            const vanishX = W / 2;
            const vanishY = H * 0.38;

            const leftBottom = W / 2 - roadW / 2;
            const rightBottom = W / 2 + roadW / 2;

            const roadGrad = ctx.createLinearGradient(vanishX, vanishY, vanishX, H);
            roadGrad.addColorStop(0, 'rgba(40,60,100,0)');
            roadGrad.addColorStop(0.3, 'rgba(20,35,70,0.55)');
            roadGrad.addColorStop(1, 'rgba(15,25,55,0.85)');

            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(leftBottom, H);
            ctx.lineTo(rightBottom, H);
            ctx.closePath();
            ctx.fillStyle = roadGrad;
            ctx.fill();

            // Dashed centre line (moving)
            const dashCount = 12;
            ctx.strokeStyle = 'rgba(255, 200, 80, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([18, 18]);
            ctx.lineDashOffset = -offset;

            for (let i = 0; i < dashCount; i++) {
                const t = i / dashCount;
                const x = vanishX;
                const y = vanishY + (H - vanishY) * t;
                const endY = vanishY + (H - vanishY) * ((i + 1) / dashCount);

                // Perspective-scale the line width
                const scale = 0.4 + t * 0.6;
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, endY);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Road edge lines
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(vanishX - 4, vanishY);
            ctx.lineTo(leftBottom, H);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(vanishX + 4, vanishY);
            ctx.lineTo(rightBottom, H);
            ctx.stroke();

            // Particles
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
                grad.addColorStop(0, 'rgba(255,107,107,0.9)');
                grad.addColorStop(1, 'rgba(255,142,83,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                p.x += p.dx;
                p.y += p.dy;
                if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
            });

            // Horizon glow
            const glowGrad = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, H * 0.45);
            glowGrad.addColorStop(0, 'rgba(255,107,107,0.12)');
            glowGrad.addColorStop(0.5, 'rgba(255,142,83,0.05)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, W, H);

            offset = (offset + 1.8) % 36;
            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ─── Feature Badge ─── */
function Badge({ icon, label }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="material-icons-round text-sm" style={{ color: '#FF6B6B' }}>{icon}</span>
            <span className="text-xs font-medium text-white/70">{label}</span>
        </div>
    );
}

/* ─── Main Login Screen ─── */
const LoginScreen = ({ onBack }) => {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            console.log("🔥 Firebase Google Login Successful");
        } catch (err) {
            console.error("Firebase Login Error:", err);
            alert("Login failed: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch bg-[#0d1b3e] overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
            
            {/* Back to Hero Button */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-6 left-6 z-[60] p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white flex items-center justify-center"
                    title="Back to Homepage"
                >
                    <span className="material-icons-round">arrow_back</span>
                </button>
            )}

            {/* ── LEFT PANEL ── */}
            <div className="relative hidden md:flex flex-col flex-1 overflow-hidden">
                <RoadCanvas />

                {/* Top logo */}
                <div className="relative z-10 flex items-center gap-3 p-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                        <span className="material-icons-round text-white text-xl">warning</span>
                    </div>
                    <span className="text-xl font-bold text-white tracking-wide">RoadHazardX</span>
                </div>

                {/* Centre hero text */}
                <div className="relative z-10 flex flex-col flex-1 justify-center px-10 pb-16">
                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit" style={{ background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)' }}>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF6B6B' }}></span>
                        <span className="text-xs font-semibold text-[#FF6B6B] uppercase tracking-widest">Live Telemetry Node</span>
                    </div>

                    <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tighter">
                        IDENTIFY YOUR<br />
                        <span style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            MUNICIPAL RANK.
                        </span>
                    </h2>
                    <p className="text-white/40 text-base max-w-sm leading-relaxed mb-10 font-medium">
                        Securely connect to the RoadHazardX network to manage road integrity, report hazards, and monitor AI-driven detections.
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-10">
                        <Badge icon="map" label="Smart Maps" />
                        <Badge icon="analytics" label="AI Insight" />
                        <Badge icon="security" label="Encrypted" />
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to top, #0d1b3e, transparent)' }} />
            </div>

            {/* ── RIGHT PANEL (Sign-in card) ── */}
            <div className="flex flex-col items-center justify-center w-full md:w-[420px] lg:w-[460px] relative px-6 py-10"
                style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>

                <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%)' }} />
                
                {/* Heading */}
                <div className="text-center mb-10 relative z-10 w-full">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[40px] mb-8 shadow-2xl relative group overflow-hidden" style={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="material-icons-round text-blue-500 text-5xl group-hover:scale-110 transition-transform">fingerprint</span>
                        <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Access Node</h1>
                    <p className="text-sm text-white/30 font-bold uppercase tracking-[0.2em] mt-2">Municipal Authentication</p>
                </div>

                {/* Firebase Auth */}
                <div className="relative z-10 w-full max-w-xs space-y-6">
                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-4 bg-white/5 hover:bg-white/10 px-8 py-5 rounded-[24px] border border-white/5 hover:border-white/20 transition-all group active:scale-95 shadow-2xl"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                        </svg>
                        <span className="text-white font-black text-sm tracking-wide">Login with Google</span>
                    </button>
                    
                    <div className="flex items-center gap-4 px-6 opacity-20">
                        <div className="flex-1 h-px bg-white"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Encrypted</span>
                        <div className="flex-1 h-px bg-white"></div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <span className="material-icons-round text-xs">verified_user</span>
                        Firebase Verified
                    </div>
                </div>

                {/* Footer Security Badge */}
                <div className="absolute bottom-8 flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-widest leading-none">
                    <span className="material-icons-round text-sm">shield</span>
                    256-Bit SSL Secured
                </div>
            </div>

            <style>{`
                @keyframes pulse-slow { 0%,100%{opacity:0.6} 50%{opacity:1} }
                .animate-pulse { animation: pulse-slow 2s cubic-bezier(0.4,0,0.6,1) infinite; }
            `}</style>
        </div>
    );
};

export default LoginScreen;
