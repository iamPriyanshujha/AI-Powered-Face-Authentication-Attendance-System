import React, { useState, useEffect } from 'react';
import { WorkflowStep, User, AttendanceRecord, AttendanceType, LivenessAction, VerificationResult } from './types';
import { LIVENESS_ACTIONS } from './constants';
import * as storage from './services/storageService';
import * as gemini from './services/geminiService';
import CameraView from './components/CameraView';
import Documentation from './components/Documentation';
import { 
  Clock, 
  FileText, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  ChevronLeft,
  UserPlus,
  ArrowRight,
  Fingerprint,
  RotateCcw,
  Loader2,
  Users as UsersIcon,
  Trash2,
  Camera,
  Save,
  RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  // --- Global State ---
  const [step, setStep] = useState<WorkflowStep>(WorkflowStep.IDLE);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'LOGS' | 'USERS'>('LOGS');

  // --- Registration Data ---
  const [regForm, setRegForm] = useState({ name: '', id: '', dept: '' });
  const [pendingRegImage, setPendingRegImage] = useState<string | null>(null);
  
  // --- Attendance Session Data ---
  const [currentAttendanceType, setCurrentAttendanceType] = useState<AttendanceType>(AttendanceType.PUNCH_IN);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessAction>(LivenessAction.BLINK);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Load data on mount
  useEffect(() => {
    setUsers(storage.getUsers());
    setLogs(storage.getAttendanceLogs());
  }, []);

  // --- Actions ---

  const handleStartAttendance = (type: AttendanceType) => {
    setCurrentAttendanceType(type);
    setVerificationResult(null);
    generateChallenge();
  };

  const generateChallenge = () => {
    const randomAction = LIVENESS_ACTIONS[Math.floor(Math.random() * LIVENESS_ACTIONS.length)];
    setCurrentChallenge(randomAction);
    setStep(WorkflowStep.ATTENDANCE_CHALLENGE);
  };

  const handleChallengeAccepted = () => {
    setStep(WorkflowStep.ATTENDANCE_CAPTURE);
  };

  const handleTryAgain = () => {
      // Pick a NEW challenge to avoid spoofing replay
      generateChallenge();
  };

  const processAttendanceCapture = async (imageSrc: string) => {
    setStep(WorkflowStep.PROCESSING);
    
    // 1. Call Gemini for Identity & Liveness
    const result = await gemini.verifyFace(imageSrc, users, currentChallenge);
    
    // 2. Default Failure Handler
    if (!result.match || !result.livenessConfirmed || result.spoofDetected || !result.userId) {
        setVerificationResult(result);
        setStep(WorkflowStep.RESULT_FAILURE);
        return;
    }

    // 3. User Identified - Perform State Validation
    const user = users.find(u => u.id === result.userId);
    if (!user) {
        setVerificationResult({...result, reason: "Identity matched but User ID missing in database"});
        setStep(WorkflowStep.RESULT_FAILURE);
        return;
    }

    const lastRecord = storage.getLastRecordForUser(user.id);
    const lastType = lastRecord?.type; // PUNCH_IN or PUNCH_OUT or undefined

    // Logic: Validate State
    // If trying to Check In
    if (currentAttendanceType === AttendanceType.PUNCH_IN) {
        if (lastType === AttendanceType.PUNCH_IN) {
            setVerificationResult({
                ...result,
                match: false, // Force fail for UI
                reason: `Already Checked In! (Last: ${new Date(lastRecord!.timestamp).toLocaleTimeString()})`
            });
            setStep(WorkflowStep.RESULT_FAILURE);
            return;
        }
    }
    // If trying to Check Out
    else if (currentAttendanceType === AttendanceType.PUNCH_OUT) {
        if (!lastType || lastType === AttendanceType.PUNCH_OUT) {
             setVerificationResult({
                ...result,
                match: false, // Force fail for UI
                reason: "Cannot Check Out: You are not Checked In."
            });
            setStep(WorkflowStep.RESULT_FAILURE);
            return;
        }
    }

    // 4. Success - Log It
    const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        type: currentAttendanceType,
        verificationConfidence: result.confidence,
        method: 'FACE_BIO'
    };
    storage.logAttendance(newRecord);
    setLogs(storage.getAttendanceLogs());
    setVerificationResult(result);
    setStep(WorkflowStep.RESULT_SUCCESS);
  };

  // Triggered when camera captures image in REGISTRATION mode
  const handleRegistrationCapture = (imageSrc: string) => {
      setPendingRegImage(imageSrc);
      setStep(WorkflowStep.REGISTER_PREVIEW);
  };

  // Triggered when user confirms the preview image
  const handleRegistrationSubmit = async () => {
      if (!pendingRegImage) return;

      setLoading(true);
      
      // 1. Validate Image Quality first
      const validation = await gemini.validateRegistrationImage(pendingRegImage);
      
      if (!validation.valid) {
          setLoading(false);
          alert(`Image rejected: ${validation.reason || "Face not clearly visible"}. Please retake.`);
          return;
      }

      // 2. Compress and save if valid
      const compressed = await gemini.compressImage(pendingRegImage, 400);
      const newUser: User = {
          id: crypto.randomUUID(),
          employeeId: regForm.id,
          name: regForm.name,
          department: regForm.dept,
          faceImage: compressed,
          registeredAt: new Date().toISOString()
      };
      
      storage.saveUser(newUser);
      setUsers(storage.getUsers());
      setLoading(false);
      setStep(WorkflowStep.REGISTER_SUCCESS);
  };

  const handleDeleteUser = (userId: string) => {
      if (confirm("Are you sure you want to delete this student/employee? This cannot be undone.")) {
          storage.deleteUser(userId);
          setUsers(storage.getUsers());
      }
  };

  // --- Renders for Each Step (Wizard Style) ---

  const renderIdle = () => (
    <div className="h-full flex flex-col">
        {/* Header */}
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <Fingerprint className="text-white w-6 h-6" />
                </div>
                <h1 className="font-bold text-xl text-gray-800">FaceAuth<span className="text-indigo-600">Station</span></h1>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                System Online
            </div>
        </header>

        {/* Main Dashboard */}
        <div className="flex-grow p-6 flex items-center justify-center bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                
                {/* Attendance Card */}
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl transform hover:scale-[1.01] transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-6" onClick={() => setStep(WorkflowStep.SELECT_MODE)}>
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                        <Clock className="w-12 h-12" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Mark Attendance</h2>
                        <p className="text-indigo-100">Touch to start biometric verification</p>
                    </div>
                    <button className="bg-white text-indigo-700 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-50 transition-colors flex items-center gap-2">
                        Start <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Secondary Actions */}
                <button 
                    onClick={() => {
                        setRegForm({name: '', id: '', dept: ''});
                        setStep(WorkflowStep.REGISTER_FORM);
                    }}
                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg border border-gray-100 flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100">
                        <UserPlus className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-700">Register Student</span>
                </button>

                <button 
                    onClick={() => setStep(WorkflowStep.HISTORY)}
                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg border border-gray-100 flex flex-col items-center justify-center gap-3 transition-all group"
                >
                    <div className="bg-purple-50 p-3 rounded-xl group-hover:bg-purple-100">
                        <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                    <span className="font-semibold text-gray-700">View Database</span>
                </button>
            </div>
        </div>
        
        <footer className="p-4 text-center text-gray-400 text-sm">
            Powered by Gemini 3 Flash Preview • <button onClick={() => setStep(WorkflowStep.HISTORY)} className="underline hover:text-gray-600">Documentation</button>
        </footer>
    </div>
  );

  const renderSelectMode = () => (
      <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in bg-white">
          <h2 className="text-3xl font-bold text-gray-800">Select Attendance Type</h2>
          <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
              <button onClick={() => handleStartAttendance(AttendanceType.PUNCH_IN)} className="flex flex-col items-center p-8 bg-green-50 border-2 border-green-200 rounded-3xl hover:bg-green-100 hover:border-green-400 transition-all shadow-sm hover:shadow-md group">
                  <div className="bg-white p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <span className="text-xl font-bold text-green-800">Check In</span>
              </button>
              <button onClick={() => handleStartAttendance(AttendanceType.PUNCH_OUT)} className="flex flex-col items-center p-8 bg-orange-50 border-2 border-orange-200 rounded-3xl hover:bg-orange-100 hover:border-orange-400 transition-all shadow-sm hover:shadow-md group">
                  <div className="bg-white p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <LogOut className="w-12 h-12 text-orange-600" />
                  </div>
                  <span className="text-xl font-bold text-orange-800">Check Out</span>
              </button>
          </div>
          <button onClick={() => setStep(WorkflowStep.IDLE)} className="flex items-center text-gray-500 hover:text-gray-800 px-6 py-2 rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 mr-1" /> Cancel
          </button>
      </div>
  );

  const renderChallenge = () => (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Liveness Check</h2>
              <p className="text-gray-500 mb-8">For security, please perform the following action when the camera starts:</p>
              
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-lg mb-8 text-left">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Your Challenge</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentChallenge}</p>
              </div>

              <button 
                onClick={handleChallengeAccepted}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                  I'm Ready
              </button>
          </div>
      </div>
  );

  const renderAttendanceCapture = () => (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900 p-4">
          <div className="w-full max-w-2xl">
              <CameraView 
                  onCapture={processAttendanceCapture}
                  instruction={`Please: ${currentChallenge}`}
                  autoCapture={true}
                  overlayColor="border-indigo-500"
              />
              <div className="mt-6 text-center">
                  <button onClick={() => setStep(WorkflowStep.IDLE)} className="text-white/50 hover:text-white text-sm hover:underline">Cancel Verification</button>
              </div>
          </div>
      </div>
  );

  const renderProcessing = () => (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center">
          <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800">Verifying Identity...</h2>
          <div className="space-y-2 mt-4 text-gray-500 text-sm">
              <p className="animate-pulse">Checking Liveness...</p>
              <p className="animate-pulse delay-100">Analyzing Facial Features...</p>
              <p className="animate-pulse delay-200">Matching Database...</p>
          </div>
      </div>
  );

  const renderResultSuccess = () => (
      <div className="h-full flex flex-col items-center justify-center bg-green-50 p-6 text-center animate-scale-up">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-green-800 mb-2">Verified</h2>
          <p className="text-green-700 text-lg mb-8">Attendance marked successfully</p>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 w-full max-w-sm">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Employee</span>
                  <span className="font-bold text-gray-800">{logs[0]?.userName}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Time</span>
                  <span className="font-bold text-gray-800">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-gray-500">Action</span>
                  <span className={`font-bold ${currentAttendanceType === AttendanceType.PUNCH_IN ? 'text-green-600' : 'text-orange-600'}`}>
                      {currentAttendanceType === AttendanceType.PUNCH_IN ? 'CHECK IN' : 'CHECK OUT'}
                  </span>
              </div>
          </div>

          <div className="mt-8 w-full max-w-sm bg-gray-200 h-2 rounded-full overflow-hidden">
             <div className="bg-green-500 h-full animate-progress" style={{width: '100%'}}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Redirecting in 3 seconds...</p>
          
          {setTimeout(() => setStep(WorkflowStep.IDLE), 3500) && null}
      </div>
  );

  const renderResultFailure = () => (
    <div className="h-full flex flex-col items-center justify-center bg-red-50 p-6 text-center animate-shake">
        <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <XCircle className="w-16 h-16 text-red-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-red-800 mb-2">Access Denied</h2>
        
        <div className="bg-white p-4 rounded-xl border border-red-100 mb-8 max-w-sm w-full">
            <p className="text-red-600 font-medium">{verificationResult?.reason || "Verification failed"}</p>
        </div>
        
        <div className="flex gap-4">
             <button onClick={() => setStep(WorkflowStep.IDLE)} className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50">
                Home
            </button>
            <button onClick={handleTryAgain} className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium shadow-lg hover:bg-red-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
            </button>
        </div>
    </div>
  );

  const renderRegisterSuccess = () => (
      <div className="h-full flex flex-col items-center justify-center bg-blue-50 p-6 text-center animate-scale-up">
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle className="w-16 h-16 text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-blue-800 mb-2">Registration Complete</h2>
          <p className="text-blue-700 text-lg mb-8">User has been added to the database.</p>
          
          <button onClick={() => setStep(WorkflowStep.IDLE)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg">
              Return to Home
          </button>
      </div>
  );

  const renderRegisterForm = () => (
      <div className="h-full overflow-auto bg-gray-50 p-6 flex flex-col items-center">
           <div className="w-full max-w-lg">
                <button onClick={() => setStep(WorkflowStep.IDLE)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </button>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">New Student Registration</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                value={regForm.name}
                                onChange={e => setRegForm({...regForm, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                            <input 
                                type="text" 
                                value={regForm.id}
                                onChange={e => setRegForm({...regForm, id: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="STU-001"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department / Class</label>
                            <input 
                                type="text" 
                                value={regForm.dept}
                                onChange={e => setRegForm({...regForm, dept: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="Computer Science"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            if (regForm.name && regForm.id) setStep(WorkflowStep.REGISTER_CAPTURE);
                            else alert("Please fill in required fields");
                        }}
                        className="w-full mt-8 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Next: Capture Face
                    </button>
                </div>
           </div>
      </div>
  );

  const renderRegisterCapture = () => (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900 p-4">
            <h2 className="text-white text-xl font-bold mb-4">Registration Photo</h2>
            <div className="w-full max-w-lg mb-6">
                <CameraView 
                    onCapture={handleRegistrationCapture}
                    instruction="Tap button below to capture"
                    overlayColor="border-blue-500"
                    autoCapture={false} 
                />
            </div>
            <button onClick={() => setStep(WorkflowStep.REGISTER_FORM)} className="text-white/60 hover:text-white">Back to Form</button>
      </div>
  );

  const renderRegisterPreview = () => (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6">
           {loading ? (
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Validating & Saving...</p>
                </div>
           ) : (
               <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg">
                   <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Confirm Photo</h2>
                   <div className="rounded-xl overflow-hidden mb-6 border-2 border-gray-100 aspect-video bg-black">
                       {pendingRegImage && (
                           <img src={pendingRegImage} alt="Preview" className="w-full h-full object-cover" />
                       )}
                   </div>
                   
                   <div className="flex gap-4">
                       <button 
                         onClick={() => setStep(WorkflowStep.REGISTER_CAPTURE)}
                         className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                       >
                           <RefreshCw className="w-4 h-4" /> Retake
                       </button>
                       <button 
                         onClick={handleRegistrationSubmit}
                         className="flex-1 py-3 bg-indigo-600 rounded-xl font-semibold text-white hover:bg-indigo-700 flex items-center justify-center gap-2"
                       >
                           <Save className="w-4 h-4" /> Save
                       </button>
                   </div>
               </div>
           )}
      </div>
  );

  const renderHistory = () => (
      <div className="h-full flex flex-col bg-gray-50">
          <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-2">
                 <button onClick={() => setStep(WorkflowStep.IDLE)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                 </button>
                 <h2 className="text-xl font-bold text-gray-800">System Dashboard</h2>
             </div>
             <button onClick={() => {
                 if(confirm("Clear all data (Logs and Users)?")) {
                     storage.clearData();
                     setLogs([]);
                     setUsers([]);
                 }
             }} className="flex items-center gap-1 text-red-500 text-sm hover:underline">
                 <Trash2 className="w-4 h-4" /> Reset System
             </button>
          </div>
          
          <div className="flex-grow overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
              {/* Tabs */}
              <div className="flex border-b bg-white">
                  <button 
                    onClick={() => setHistoryTab('LOGS')}
                    className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${historyTab === 'LOGS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                      <div className="flex items-center justify-center gap-2">
                          <FileText className="w-4 h-4" /> Attendance Logs
                      </div>
                  </button>
                  <button 
                    onClick={() => setHistoryTab('USERS')}
                    className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${historyTab === 'USERS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                      <div className="flex items-center justify-center gap-2">
                          <UsersIcon className="w-4 h-4" /> Registered Users ({users.length})
                      </div>
                  </button>
              </div>

              {/* Content */}
              <div className="flex-grow overflow-auto p-6">
                {historyTab === 'LOGS' && (
                    logs.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <Clock className="w-12 h-12 mb-3 opacity-20" />
                            <p>No activity recorded</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Employee</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Timestamp</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Confidence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium text-gray-900">{log.userName}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.type === AttendanceType.PUNCH_IN ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {log.type === AttendanceType.PUNCH_IN ? 'CHECK IN' : 'CHECK OUT'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">{(log.verificationConfidence * 100).toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {historyTab === 'USERS' && (
                    users.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <UsersIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p>No registered users</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map(user => (
                                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                            <img src={user.faceImage} alt={user.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-bold text-gray-900 text-lg truncate">{user.name}</h3>
                                            <p className="text-sm text-gray-500">ID: {user.employeeId}</p>
                                            <p className="text-sm text-gray-500">{user.department}</p>
                                            <p className="text-xs text-gray-400 mt-2">Reg: {new Date(user.registeredAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="absolute top-2 right-2 p-2 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Docs Footer */}
                <div className="mt-12">
                     <Documentation />
                </div>
              </div>
          </div>
      </div>
  );

  // --- Main Switch ---

  return (
    <div className="h-screen w-full bg-gray-100 overflow-hidden font-sans">
        {step === WorkflowStep.IDLE && renderIdle()}
        {step === WorkflowStep.SELECT_MODE && renderSelectMode()}
        {step === WorkflowStep.ATTENDANCE_CHALLENGE && renderChallenge()}
        {step === WorkflowStep.ATTENDANCE_CAPTURE && renderAttendanceCapture()}
        {step === WorkflowStep.PROCESSING && renderProcessing()}
        {step === WorkflowStep.RESULT_SUCCESS && renderResultSuccess()}
        {step === WorkflowStep.RESULT_FAILURE && renderResultFailure()}
        {step === WorkflowStep.REGISTER_FORM && renderRegisterForm()}
        {step === WorkflowStep.REGISTER_CAPTURE && renderRegisterCapture()}
        {step === WorkflowStep.REGISTER_PREVIEW && renderRegisterPreview()}
        {step === WorkflowStep.REGISTER_SUCCESS && renderRegisterSuccess()}
        {step === WorkflowStep.HISTORY && renderHistory()}
    </div>
  );
};

export default App;