import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';
import AdminDashboard from './AdminDashboard';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

function App() {
  const [hazards, setHazards] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useUser();

  // --- Real-time Hazard Listener ---
  useEffect(() => {
    const q = query(collection(db, "hazards"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hazardList = [];
      snapshot.forEach((doc) => {
        hazardList.push({ id: doc.id, ...doc.data() });
      });
      setHazards(hazardList);
      setIsLoaded(true);
    }, (error) => {
      console.error("Firebase fetch error:", error);
    });

    return () => unsubscribe();
  }, []);

  const AUTHORIZED_EMAIL = 'roadhazex@gmail.com';
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAuthorized = userEmail === AUTHORIZED_EMAIL;

  return (
    <div className="w-full h-screen bg-[#020617] overflow-hidden">
      <SignedIn>
        {isAuthorized ? (
          /* Main Administrative Dashboard */
          <div className="w-full h-full flex flex-col relative animate-fade-in">
               <AdminDashboard hazards={hazards} />
               
               {/* Floating Clerk Profile Trigger */}
               <div className="absolute top-4 right-4 z-50">
                   <div className="bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-2xl flex items-center gap-2 pl-3 pr-1">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none pr-1">Authorized Official</span>
                       <UserButton afterSignOutUrl="/" />
                   </div>
               </div>
          </div>
        ) : (
          /* Access Restricted View */
          <div className="w-full h-full flex items-center justify-center p-6 bg-command-center relative overflow-hidden">
               <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[40px] border border-white/10 shadow-2xl relative z-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="material-icons-round text-red-500 text-4xl">gpp_maybe</span>
                    </div>
                    <h2 className="text-3xl font-black text-white leading-tight">Access <br/> Restricted</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        The account <strong>{userEmail}</strong> is not authorized to access this municipal node. 
                        Please sign in with the official department credentials.
                    </p>
                    <div className="pt-4">
                        <UserButton afterSignOutUrl="/" showName />
                    </div>
               </div>
               {/* Decorative background for error */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] -z-10"></div>
          </div>
        )}
      </SignedIn>

      <SignedOut>
        <div className="w-full h-full flex items-center justify-center p-6 bg-command-center relative overflow-hidden">
             {/* Decorative Elements */}
             <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[160px]"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[140px]"></div>

             <div className="w-full max-w-[1200px] flex flex-col md:flex-row items-center gap-16 relative z-10">
                 {/* Left Side: Branding */}
                 <div className="flex-1 text-center md:text-left space-y-8 max-w-xl">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Secure Node 0x7F</span>
                      </div>
                      <h1 className="text-6xl md:text-7xl font-black text-white leading-none tracking-tight">
                         Municipal <br/>
                         <span className="text-linear-to-r from-blue-400 to-cyan-400">Command Center</span>
                      </h1>
                      <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                         Authorized personnel only. Access the real-time road safety infrastructure and hazard resolution engine.
                      </p>
                      
                      <div className="pt-8 flex flex-col md:flex-row gap-8 items-center md:items-start opacity-60">
                           <div className="flex items-center gap-3">
                                <span className="material-icons-round text-blue-500 text-3xl">verified_user</span>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Real-Time <br/> Verification</div>
                           </div>
                           <div className="flex items-center gap-3">
                                <span className="material-icons-round text-cyan-400 text-3xl">terminal</span>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Incident <br/> Management</div>
                           </div>
                      </div>
                 </div>

                 {/* Right Side: Clerk SignIn */}
                 <div className="w-full max-w-md shrink-0">
                      <div className="p-1 rounded-[44px] bg-linear-to-br from-white/10 to-white/0 shadow-2xl relative">
                           <div className="absolute -inset-4 bg-blue-500/10 blur-3xl -z-10 rounded-full"></div>
                           <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[40px] p-2 border border-white/5">
                                <SignIn 
                                    appearance={{
                                        elements: {
                                            rootBox: "w-full",
                                            card: "bg-transparent shadow-none border-none p-4",
                                            headerTitle: "text-white text-xl font-black uppercase tracking-tight text-center",
                                            headerSubtitle: "text-slate-400 text-xs font-bold uppercase tracking-widest text-center",
                                            socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all rounded-2xl",
                                            socialButtonsBlockButtonText: "text-white font-bold",
                                            dividerLine: "bg-white/5",
                                            dividerText: "text-slate-500 text-[10px] font-black uppercase",
                                            formFieldLabel: "text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1 mb-2",
                                            formFieldInput: "bg-white/5 border border-white/10 text-white rounded-2xl py-3 focus:ring-blue-500/30",
                                            formButtonPrimary: "bg-linear-to-r from-blue-600 to-blue-500 hover:scale-[1.02] transform transition-all rounded-2xl py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-900/40",
                                            footerActionText: "text-slate-500",
                                            footerActionLink: "text-blue-400 font-bold hover:text-blue-300",
                                            identityPreviewText: "text-white",
                                            identityPreviewEditButtonIcon: "text-blue-400"
                                        }
                                    }}
                                />
                           </div>
                      </div>
                 </div>
             </div>

             {/* Footer Info */}
             <div className="absolute bottom-10 left-0 right-0 text-center opacity-30 pointer-events-none">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">RoadHazeX Administrative Terminal // v3.2.0</div>
             </div>
        </div>
      </SignedOut>
    </div>
  );
}

export default App;
