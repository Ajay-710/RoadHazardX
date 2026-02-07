import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const LoginScreen = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400">Sign in to access RoadHazardX</p>
                </div>

                <div className="flex justify-center">
                    <SignIn
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "bg-transparent shadow-none w-full",
                                headerTitle: "hidden",
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
                                socialButtonsBlockButtonText: "font-semibold",
                                dividerLine: "bg-white/10",
                                dividerText: "text-gray-500",
                                formFieldLabel: "text-gray-400",
                                formFieldInput: "bg-white/5 border-white/10 text-white focus:border-primary",
                                footerActionLink: "text-primary hover:text-primary/80",
                                identityPreviewText: "text-white",
                                formButtonPrimary: "bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
