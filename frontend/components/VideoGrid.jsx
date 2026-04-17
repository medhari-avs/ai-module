import { useEffect, useRef } from 'react';

function VideoPlayer({ stream, isLocal = false, isHandRaised = false, isSharingScreen = false, metadata = {}, isSpeaking = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const isVideoEnabled = isLocal 
    ? (stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled)
    : metadata.isVideoOn !== false; // Default to true if not specified

  return (
    <div className={`relative w-full aspect-video bg-[#1e2025] rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 flex items-center justify-center group ${isSpeaking ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.02]' : 'border-gray-800'}`}>
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131417] z-10">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-2xl font-bold mb-4 border border-gray-700">
            {metadata.displayName?.substring(0, 1) || (isLocal ? 'Y' : 'P')}
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide">Camera is Off</p>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal && !isSharingScreen ? 'transform -scale-x-100' : ''} ${!isVideoEnabled ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {isHandRaised && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white p-2 rounded-full shadow-lg animate-bounce border-2 border-yellow-400 z-20">
          <span className="text-xl">✋</span>
        </div>
      )}

      {isSpeaking && (
        <div className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-2 border border-blue-400 animate-in fade-in zoom-in duration-300">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white animate-pulse"></div>
            <div className="w-1 h-4 bg-white animate-bounce"></div>
            <div className="w-1 h-2 bg-white animate-pulse"></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Speaking</span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
        <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-lg text-white text-sm font-semibold tracking-wide border border-white/10 shadow-lg flex items-center gap-2">
          {isLocal ? 'You' : (metadata.displayName || 'Participant')}
          {!isVideoEnabled && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Muted Video</span>}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
    </div>
  );
}

export default function VideoGrid({ localStream, remoteStreams, participantsMetadata = {}, localHandRaised = false, isSharingScreen = false }) {
  const totalStreams = 1 + Object.keys(remoteStreams).length;
  
  let gridClass = 'grid-cols-1 max-w-4xl';
  if (totalStreams === 2) gridClass = 'grid-cols-1 md:grid-cols-2 max-w-6xl';
  else if (totalStreams >= 3 && totalStreams <= 4) gridClass = 'grid-cols-2 max-w-6xl';
  else if (totalStreams > 4) gridClass = 'grid-cols-2 lg:grid-cols-3 max-w-7xl';

  return (
    <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
      <div className={`grid gap-6 w-full ${gridClass} mx-auto items-center justify-items-center`}>
        <VideoPlayer 
          stream={localStream} 
          isLocal={true} 
          isHandRaised={localHandRaised}
          isSharingScreen={isSharingScreen}
          metadata={{ displayName: 'You' }}
        />
        
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <VideoPlayer 
            key={peerId} 
            stream={stream} 
            isHandRaised={participantsMetadata[peerId]?.isHandRaised}
            metadata={participantsMetadata[peerId] || {}}
            isSpeaking={participantsMetadata[peerId]?.isSpeaking}
          />
        ))}
      </div>
    </div>
  );
}
