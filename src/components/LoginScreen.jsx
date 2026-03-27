import React, { useEffect, useRef } from 'react';
import { SignIn } from '@clerk/clerk-react';

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

/* ─── Stat Card ─── */
function Stat({ value, label }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</span>
            <span className="text-xs text-white/50 mt-0.5">{label}</span>
        </div>
    );
}

/* ─── Main Login Screen ─── */
const LoginScreen = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-stretch bg-[#0d1b3e] overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>

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
                        <span className="text-xs font-semibold text-[#FF6B6B] uppercase tracking-widest">Live Hazard Tracking</span>
                    </div>

                    <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                        Report Roads.<br />
                        <span style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Save Lives.
                        </span>
                    </h2>
                    <p className="text-white/50 text-base max-w-sm leading-relaxed mb-8">
                        Join thousands of drivers reporting real-time road hazards — potholes, accidents, waterlogging, and debris — to keep everyone safe.
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-10">
                        <Badge icon="map" label="Smart Navigation" />
                        <Badge icon="camera_alt" label="AI Detection" />
                        <Badge icon="people" label="Community Driven" />
                        <Badge icon="notifications_active" label="Real-time Alerts" />
                    </div>


                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to top, #0d1b3e, transparent)' }} />
            </div>

            {/* ── RIGHT PANEL (Sign-in card) ── */}
            <div className="flex flex-col items-center justify-center w-full md:w-[420px] lg:w-[460px] relative px-6 py-10"
                style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Ambient glow blob */}
                <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,107,107,0.15) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,142,83,0.12) 0%, transparent 70%)' }} />

                {/* Mobile logo (shown only on small screens) */}
                <div className="flex md:hidden items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                        <span className="material-icons-round text-white text-xl">warning</span>
                    </div>
                    <span className="text-xl font-bold text-white tracking-wide">RoadHazardX</span>
                </div>

                {/* Heading */}
                <div className="text-center mb-6 relative z-10 w-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                        <span className="material-icons-round text-white text-3xl">shield</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">Welcome Back</h1>
                    <p className="text-sm text-white/45">Sign in to access your RoadHazardX dashboard</p>
                </div>

                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-none" style={{ background: 'linear-gradient(90deg,#FF6B6B,#FF8E53,#FF6B6B)', backgroundSize: '200% 100%' }} />

                {/* Clerk SignIn */}
                <div className="relative z-10 w-full max-w-sm">
                    <SignIn
                        appearance={{
                            variables: {
                                colorPrimary: '#FF6B6B',
                                colorBackground: 'transparent',
                                colorText: '#fff',
                                colorTextSecondary: 'rgba(255,255,255,0.5)',
                                colorInputBackground: 'rgba(255,255,255,0.05)',
                                colorInputText: '#fff',
                                borderRadius: '12px',
                                fontFamily: "'Outfit', sans-serif",
                            },
                            elements: {
                                rootBox: 'w-full',
                                card: 'bg-transparent shadow-none w-full p-0',
                                headerTitle: 'hidden',
                                headerSubtitle: 'hidden',
                                header: 'hidden',

                                // Social button
                                socialButtonsBlockButton: [
                                    'w-full flex items-center justify-center gap-3',
                                    'rounded-xl py-3 px-4 font-semibold text-sm text-white',
                                    'transition-all duration-200',
                                ].join(' '),
                                socialButtonsBlockButtonText: 'font-semibold text-white',

                                // Hide "Last used" badge
                                badge: 'hidden',

                                // Divider
                                dividerLine: 'bg-white/10',
                                dividerText: 'text-white/35 text-xs uppercase tracking-widest',

                                // Form fields
                                formFieldLabel: 'text-white/60 text-sm font-medium mb-1',
                                formFieldInput: [
                                    'rounded-xl py-3 px-4 text-white text-sm',
                                    'transition-all duration-200 outline-none',
                                ].join(' '),
                                formFieldInputShowPasswordButton: 'text-white/40 hover:text-white',

                                // Primary button
                                formButtonPrimary: [
                                    'w-full rounded-xl py-3 font-bold text-white text-sm',
                                    'transition-all duration-200',
                                    'shadow-lg',
                                ].join(' '),

                                // Footer
                                footerActionText: 'text-white/40 text-xs',
                                footerActionLink: 'text-[#FF6B6B] font-semibold hover:text-[#FF8E53] transition-colors text-xs',
                                footer: 'mt-2',

                                identityPreviewText: 'text-white',
                                identityPreviewEditButtonIcon: 'text-[#FF6B6B]',

                                // Alert / error
                                formFieldErrorText: 'text-red-400 text-xs mt-1',
                                alertText: 'text-red-400 text-xs',
                            },
                        }}
                    />
                </div>

                {/* Secured badge */}
                <div className="relative z-10 mt-6 flex items-center gap-2 text-white/25 text-xs">
                    <span className="material-icons-round text-sm">lock</span>
                    <span>Secured by Clerk · End-to-end encrypted</span>
                </div>
            </div>

            {/* Global animations */}
            <style>{`
                @keyframes pulse-slow { 0%,100%{opacity:0.6} 50%{opacity:1} }
                .animate-pulse { animation: pulse-slow 2s cubic-bezier(0.4,0,0.6,1) infinite; }

                @keyframes shimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Clerk overrides via CSS variables */
                .cl-socialButtonsBlockButton {
                    background: rgba(255,255,255,0.06) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    position: relative !important;
                    overflow: visible !important;
                }

                /* Hide the "Last used" badge — catch every possible Clerk class name */
                [class*="badge"],
                [class*="Badge"],
                [class*="last-used"],
                [class*="lastUsed"],
                [data-localization-key*="lastUsed"],
                [data-localization-key*="last_used"] {
                    display: none !important;
                }
                .cl-socialButtonsBlockButton:hover {
                    background: rgba(255,255,255,0.12) !important;
                    border-color: rgba(255,107,107,0.4) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 20px rgba(255,107,107,0.15) !important;
                }
                .cl-formFieldInput {
                    background: rgba(255,255,255,0.05) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    color: #fff !important;
                }
                .cl-formFieldInput:focus {
                    border-color: rgba(255,107,107,0.6) !important;
                    box-shadow: 0 0 0 3px rgba(255,107,107,0.12) !important;
                    background: rgba(255,255,255,0.08) !important;
                }
                .cl-formButtonPrimary {
                    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%) !important;
                    border: none !important;
                    box-shadow: 0 8px 24px rgba(255,107,107,0.35) !important;
                }
                .cl-formButtonPrimary:hover {
                    opacity: 0.92 !important;
                    box-shadow: 0 12px 32px rgba(255,107,107,0.5) !important;
                    transform: translateY(-1px) !important;
                }
                .cl-card {
                    background: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .cl-internal-b3fm6y {
                    background: transparent !important;
                }
                .cl-footerAction {
                    background: transparent !important;
                }
            `}</style>
        </div>
    );
};

export default LoginScreen;
