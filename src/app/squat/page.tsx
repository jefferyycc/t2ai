 "use client";

import React, { useState, useRef } from "react";
import Link from "next/link";

export default function SquatAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputType, setInputType] = useState<"none" | "webcam" | "video">("none");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock states based on Python analyser logic
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    spineFlexion: { status: "pending", text: "Waiting for input..." },
    heelPosition: { status: "pending", text: "Waiting for input..." },
    kneeTracking: { status: "pending", text: "Waiting for input..." },
    depth: { status: "pending", text: "Waiting for input..." },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      handleStartAnalysis("video", file.name);
    }
  };

  const handleStartAnalysis = (type: "webcam" | "video", url?: string) => {
    setInputType(type);
    setIsAnalyzing(true);
    setReps(0);
    setScore(null);
    
    // Mock analysis based on video filename
    let mockMetrics: Record<string, { status: string; text: string }> = {};
    let mockScore: number | null = null;
    let mockReps = 0;

    if (url?.includes('incorrect_results.mp4')) {
      mockMetrics = {
        spineFlexion: { status: "error", text: "Significant lower back rounding (buttwink) observed." },
        heelPosition: { status: "warning", text: "Heels lifting slightly at the bottom of the movement." },
        kneeTracking: { status: "error", text: "Knees caving inwards (valgus). Keep them pushed out." },
        depth: { status: "warning", text: "Failed to reach parallel depth (half squat)." },
      };
      mockScore = 45;
      mockReps = 3;
    } else if (url?.includes('correct_results.mp4')) {
      mockMetrics = {
        spineFlexion: { status: "good", text: "Excellent posture maintained throughout." },
        heelPosition: { status: "good", text: "Heels remained perfectly grounded." },
        kneeTracking: { status: "good", text: "Perfect alignment, knees tracking over toes." },
        depth: { status: "good", text: "Achieved ideal depth below parallel." },
      };
      mockScore = 95;
      mockReps = 5;
    } else {
      mockMetrics = {
        spineFlexion: { status: "good", text: "Solid neutral spine maintained overall." },
        heelPosition: { status: "good", text: "Weight distributed well on the heels." },
        kneeTracking: { status: "warning", text: "Slight knee cave on the ascent. Focus on pushing knees out." },
        depth: { status: "warning", text: "Just shy of parallel. Try to go a bit deeper." },
      };
      mockScore = 72;
      mockReps = 4;
    }

    // Simulate initial analysis
    setMetrics({
      spineFlexion: { status: "pending", text: "Analyzing..." },
      heelPosition: { status: "pending", text: "Analyzing..." },
      kneeTracking: { status: "pending", text: "Analyzing..." },
      depth: { status: "pending", text: "Analyzing..." },
    });

    // Mock rep counter and results
    setTimeout(() => {
      setReps(mockReps);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMetrics(mockMetrics as any);
      setScore(mockScore);
    }, 3000);
  };

  const renderStatusIcon = (status: string) => {
    switch(status) {
      case "good": return <span className="text-green-500 font-bold">✓</span>;
      case "warning": return <span className="text-amber-500 font-bold">!</span>;
      case "error": return <span className="text-red-500 font-bold">✕</span>;
      default: return <span className="text-slate-400 font-bold">-</span>;
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Squat Form Analysis</h1>
        <Link 
          href="/dashboard"
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium transition-colors border border-slate-200"
        >
          Back to Dashboard
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Video/Webcam Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-xl overflow-hidden relative flex flex-col items-center justify-center aspect-video border border-slate-800">
            {!isAnalyzing ? (
              <div className="text-center p-8">
                <p className="text-slate-400 mb-6">Choose Input Method</p>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 justify-center">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                    >
                      Upload Video File
                    </button>
                    <input 
                      type="file" 
                      accept="video/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </div>
                  
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative bg-slate-800 flex items-center justify-center">
                {inputType === "video" && videoUrl ? (
                  <video 
                    src={videoUrl} 
                    className="w-full h-full object-contain"
                    controls 
                    autoPlay 
                    muted 
                    loop 
                  />
                ) : (
                  <p className="text-slate-400">
                    {inputType === "webcam" ? "Webcam Feed Active" : "Video Playing"}
                  </p>
                )}
                
                {/* Mock Landmarking overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-transparent"></div>
                
                {/* Overlay UI (reps) */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg font-mono text-xl border border-white/10">
                  Reps: {reps}
                </div>
                
              </div>
            )}
          </div>

          {/* Action Button below the video container */}
          {isAnalyzing && (
            <div className="flex justify-center mt-6">
              <button 
                onClick={() => {
                  if (score !== null) {
                    // "Upload Another Video" logic
                    setIsAnalyzing(false);
                    if (videoUrl) {
                      URL.revokeObjectURL(videoUrl);
                      setVideoUrl(null);
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                    fileInputRef.current?.click();
                  } else {
                    // "Stop Analysis" logic
                    setIsAnalyzing(false);
                    if (videoUrl) {
                      URL.revokeObjectURL(videoUrl);
                      setVideoUrl(null);
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm ${
                  score !== null 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "bg-red-600/90 text-white hover:bg-red-600"
                }`}
              >
                {score !== null ? "Upload Another Video" : "Stop Analysis"}
              </button>
            </div>
          )}
        </div>
        
        {/* Right Column: Analysis Results */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Feedback
              {isAnalyzing && !score && (
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </h2>
            {score !== null && (
              <div className={`text-2xl font-bold ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {score}/100
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Spine Flexion */}
            <div className={`p-4 rounded-lg border ${isAnalyzing ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-slate-800">Spine Flexion</h3>
                {renderStatusIcon(metrics.spineFlexion.status)}
              </div>
              <p className="text-slate-600 text-sm">{metrics.spineFlexion.text}</p>
            </div>

            {/* Heel Position */}
            <div className={`p-4 rounded-lg border ${isAnalyzing ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-slate-800">Heel Position</h3>
                {renderStatusIcon(metrics.heelPosition.status)}
              </div>
              <p className="text-slate-600 text-sm">{metrics.heelPosition.text}</p>
            </div>

            {/* Knee Tracking */}
            <div className={`p-4 rounded-lg border ${isAnalyzing ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-slate-800">Knee Tracking</h3>
                {renderStatusIcon(metrics.kneeTracking.status)}
              </div>
              <p className="text-slate-600 text-sm">{metrics.kneeTracking.text}</p>
            </div>

            {/* Depth */}
            <div className={`p-4 rounded-lg border ${isAnalyzing ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-slate-800">Depth</h3>
                {renderStatusIcon(metrics.depth.status)}
              </div>
              <p className="text-slate-600 text-sm">{metrics.depth.text}</p>
            </div>
          </div>
          
          {score !== null && score < 80 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1 rounded-full text-xs">ℹ</span>
                Correct Form Reference
              </h3>
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <video 
                  src="/correct_results.mp4" 
                  className="w-full aspect-video object-cover"
                  controls
                  muted
                  loop
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 italic">
                Compare your movement with this reference to improve your score.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
