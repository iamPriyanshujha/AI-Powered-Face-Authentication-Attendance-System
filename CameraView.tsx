import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageSrc: string) => void;
  isCapturing?: boolean;
  instruction?: string;
  overlayColor?: string;
  autoCapture?: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ 
    onCapture, 
    isCapturing, 
    instruction, 
    overlayColor = 'border-indigo-500',
    autoCapture = false 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for data to actually load
        videoRef.current.onloadedmetadata = () => {
            setStreamActive(true);
            videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera unavailable. Check permissions or close other apps using the camera.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current && streamActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Mirror
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Return a slightly compressed jpeg
        const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageSrc);
      }
    }
  }, [onCapture, streamActive]);

  // Handle Auto Capture Logic
  useEffect(() => {
      if (autoCapture && streamActive && !isCapturing && countdown === null) {
          setCountdown(3);
      }
  }, [autoCapture, streamActive, isCapturing, countdown]);

  useEffect(() => {
      if (countdown === null) return;
      if (countdown > 0) {
          const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
          return () => clearTimeout(timer);
      } else if (countdown === 0) {
          capture();
          setCountdown(null);
      }
  }, [countdown, capture]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      <canvas ref={canvasRef} className="hidden" />
      
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${streamActive ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* States */}
      {!streamActive && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 z-10">
          <RefreshCw className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
          <p>Connecting to Camera...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center z-20">
            <Camera className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                Retry Connection
            </button>
        </div>
      )}

      {/* Overlay UI */}
      {streamActive && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
            
            {/* Top Instruction */}
            <div className="w-full flex justify-center">
                <div className="bg-black/60 backdrop-blur-md text-white py-2 px-6 rounded-full text-center font-medium shadow-lg border border-white/10 animate-fade-in-down">
                    {instruction || "Align face within the frame"}
                </div>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-9xl font-bold text-white/80 drop-shadow-2xl animate-ping">
                        {countdown}
                    </div>
                </div>
            )}

            {/* Face Guide Frame */}
            <div className={`absolute inset-0 flex items-center justify-center`}>
                 <div className={`w-64 h-80 border-2 ${overlayColor} rounded-[3rem] opacity-60 border-dashed relative`}>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-xl -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-xl -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-xl -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-xl -mb-1 -mr-1"></div>
                 </div>
            </div>

            {/* Bottom Controls */}
            <div className="pointer-events-auto flex flex-col items-center justify-end h-full pb-4">
                {!autoCapture && (
                    <div className="flex flex-col items-center gap-2 animate-bounce-subtle">
                        <button
                            onClick={capture}
                            disabled={isCapturing}
                            className={`
                                group w-20 h-20 rounded-full border-4 border-white/40 bg-white/20 backdrop-blur flex items-center justify-center
                                hover:bg-white/30 hover:scale-105 active:scale-95 transition-all duration-200
                                ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className={`w-16 h-16 rounded-full ${isCapturing ? 'bg-gray-400' : 'bg-white'} shadow-inner flex items-center justify-center`}>
                                <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                        </button>
                        <span className="text-white text-sm font-semibold shadow-black drop-shadow-md bg-black/40 px-2 rounded">Tap to Capture</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;