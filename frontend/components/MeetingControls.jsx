import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, Monitor, Hand, Users, Camera as CameraIcon, Captions, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MeetingControls({ 
  roomId,
  onToggleVideo, 
  onToggleAudio, 
  onToggleScreenShare,
  onToggleRaiseHand,
  onToggleCaptions,
  onTakeSnapshot,
  isSharingScreen,
  isHandRaised,
  isCaptionsOn,
  isTranslationEnabled,
  setIsTranslationEnabled,
  transcriptionLanguage,
  setTranscriptionLanguage,
  toggleChatVisibility, 
  togglePeopleVisibility,
  hasUnreadMessages,
  toggleRightPanel,
  onExportRecap,
  isGeneratingRecap
}) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const navigate = useNavigate();

  const handleVideo = () => {
    setIsVideoOn(!isVideoOn);
    if(onToggleVideo) onToggleVideo();
  };

  const handleAudio = () => {
    setIsAudioOn(!isAudioOn);
    if(onToggleAudio) onToggleAudio();
  };

  const leaveCall = () => {
    navigate(`/left-meeting/${roomId}`);
  };

  const btnBase = "h-12 w-12 rounded-full transition-all flex items-center justify-center transform hover:bg-[#4a4d53] text-[#b4b7bd]";
  const btnActive = "h-12 w-12 rounded-full transition-all flex items-center justify-center transform text-white";

  return (
    <div className="flex items-center justify-between px-6 py-4 w-full">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300 font-medium tracking-wide">CC / Live Transcript</span>
        <div 
          onClick={onToggleCaptions}
          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isCaptionsOn ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isCaptionsOn ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
        
        {isCaptionsOn && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">English Mode Active</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 bg-[#1e2025] rounded-full px-4 py-2 shadow-sm border border-gray-800">
        <button
          onClick={handleAudio}
          className={`${isAudioOn ? btnBase : btnActive + ' bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
        >
          {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={handleVideo}
          className={`${isVideoOn ? btnBase : btnActive + ' bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1"></div>


        <button
          onClick={onToggleScreenShare}
          className={isSharingScreen ? "h-12 border border-blue-500 bg-blue-500/10 w-12 rounded-full flex items-center justify-center text-blue-400" : btnBase}
        >
          <Monitor size={20} />
        </button>

        <button
          onClick={onToggleCaptions}
          className={isCaptionsOn ? "h-12 bg-blue-600 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" : btnBase}
        >
          CC
        </button>

        <button
          onClick={onToggleRaiseHand}
          className={isHandRaised ? "h-12 bg-yellow-500/20 border border-yellow-500 w-12 rounded-full flex items-center justify-center text-yellow-500" : btnBase}
        >
          <Hand size={20} />
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1"></div>

        <button
          onClick={() => toggleRightPanel && toggleRightPanel('people')}
          className={btnBase}
        >
          <Users size={20} />
        </button>

        <button
          onClick={() => toggleRightPanel && toggleRightPanel('chat')}
          className={`${btnBase} relative`}
        >
          <MessageSquare size={20} />
          {hasUnreadMessages && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={onTakeSnapshot}
          className={`${btnBase} group relative`}
        >
          <CameraIcon size={20} />
          <div className="absolute bottom-full mb-3 hidden group-hover:block whitespace-nowrap bg-[#2c2f35] text-white text-xs px-3 py-1.5 rounded-lg border border-[#3b3d44]">
            Take Snapshot
          </div>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onExportRecap}
          disabled={isGeneratingRecap}
          className={`${isGeneratingRecap ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'} text-white px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-lg transition-colors`}
        >
          {isGeneratingRecap ? 'Generating...' : 'Export Recap'}
        </button>
        <button
          onClick={leaveCall}
          className="bg-[#d93025] hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm flex items-center gap-3 shadow-lg"
        >
          <PhoneOff size={18} />
          <span className="hidden sm:inline">LEAVE</span>
        </button>
      </div>
    </div>
  );
}
