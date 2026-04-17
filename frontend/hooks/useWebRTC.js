import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId, autoStart = true) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [participantsMetadata, setParticipantsMetadata] = useState({});
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  
  const isHost = useRef(localStorage.getItem(`meeting_host_${roomId}`) === 'true');
  
  const clientId = useRef(Math.random().toString(36).substring(7));
  const ws = useRef(null);
  const peerConnections = useRef({});
  const originalStream = useRef(null);
  const activeStreamsRef = useRef([]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    
    let mounted = true;
    const startConnection = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        originalStream.current = stream;
        activeStreamsRef.current.push(stream);
        setLocalStream(stream);

        ws.current = new WebSocket(`ws://localhost:8000/ws/${roomId}/${clientId.current}`);

        ws.current.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          handleSignalingData(msg, stream);
        };
      } catch (err) {
        if (!mounted) return;
        setMediaError(err.name === 'NotAllowedError' ? 'Permission Denied' : err.message || 'Media Device Error');
      }
    };

    startConnection();

    return () => {
      mounted = false;
      
      activeStreamsRef.current.forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.label} (${track.kind})`);
          });
        }
      });
      activeStreamsRef.current = [];

      if (ws.current) {
        ws.current.close();
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [roomId]);

  const createPeerConnection = (senderId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          target: senderId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [senderId]: event.streams[0],
      }));
    };

    peerConnections.current[senderId] = pc;
    return pc;
  };

  const handleSignalingData = async (data, stream) => {
    const { type, sender, target } = data;

    if (sender === clientId.current) return;
    if (target && target !== clientId.current) return;

    switch (type) {
      case 'user-joined':
        const pc = createPeerConnection(sender, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessage({ type: 'offer', target: sender, offer });
        
        if (isHandRaised) {
          sendSignalingMessage({ type: 'raise-hand' });
        }
        break;

      case 'offer':
        const pcOffer = createPeerConnection(sender, stream);
        await pcOffer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pcOffer.createAnswer();
        await pcOffer.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', target: sender, answer });
        break;

      case 'answer':
        const pcAnswer = peerConnections.current[sender];
        if (pcAnswer && pcAnswer.signalingState !== 'stable') {
          await pcAnswer.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        break;

      case 'ice-candidate':
        const pcIce = peerConnections.current[sender];
        if (pcIce) {
          try {
            await pcIce.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding received ice candidate', e);
          }
        }
        break;

      case 'user-left':
        if (peerConnections.current[sender]) {
          peerConnections.current[sender].close();
          delete peerConnections.current[sender];
          
          setRemoteStreams((prev) => {
            const newStreams = { ...prev };
            delete newStreams[sender];
            return newStreams;
          });

          setParticipantsMetadata((prev) => {
            const newMeta = { ...prev };
            delete newMeta[sender];
            return newMeta;
          });
        }
        break;

      case 'chat':
        addMessage({ sender: data.sender, text: data.text });
        break;

      case 'raise-hand':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], isHandRaised: true }
        }));
        break;

      case 'lower-hand':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], isHandRaised: false }
        }));
        break;

      case 'caption':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], isSpeaking: true, lastCaptionTime: Date.now() }
        }));
        setTimeout(() => {
          setParticipantsMetadata(prev => {
             const meta = prev[sender] || {};
             if (Date.now() - (meta.lastCaptionTime || 0) >= 4500) {
               return { ...prev, [sender]: { ...meta, isSpeaking: false } };
             }
             return prev;
          });
        }, 5000);
        
        window.dispatchEvent(new CustomEvent('new-caption', { detail: data }));
        break;

      case 'status-update':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], status: data.status, lastUpdated: Date.now() }
        }));
        break;

      case 'media-update':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], [data.mediaType === 'video' ? 'isVideoOn' : 'isAudioOn']: data.enabled }
        }));
        break;

      default:
        break;
    }
  };

  const sendSignalingMessage = (msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        sendSignalingMessage({ type: 'media-update', mediaType: 'video', enabled: newState });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        sendSignalingMessage({ type: 'media-update', mediaType: 'audio', enabled: newState });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        activeStreamsRef.current.push(screenStream);
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peerConnections.current).forEach(pc => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          stopScreenShare(screenTrack);
        };

        setLocalStream(screenStream);
        setIsSharingScreen(true);
      } else {
        const screenTrack = localStream.getVideoTracks()[0];
        stopScreenShare(screenTrack);
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopScreenShare = (screenTrack) => {
    if (screenTrack) screenTrack.stop();
    
    const camTrack = originalStream.current.getVideoTracks()[0];
    
    Object.values(peerConnections.current).forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(camTrack);
      }
    });

    setLocalStream(originalStream.current);
    setIsSharingScreen(false);
  };

  const toggleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    sendSignalingMessage({ type: newState ? 'raise-hand' : 'lower-hand' });
  };

  const sendChatMessage = (text) => {
    const msgData = { type: 'chat', text };
    sendSignalingMessage(msgData);
    addMessage({ sender: 'Me', text });
  };

  const sendCaptionMessage = (text) => {
    const displayName = localStorage.getItem('guest_display_name') || 'Participant';
    sendSignalingMessage({ type: 'caption', text, senderName: displayName });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      sendSignalingMessage({ type: 'status-update', status: document.hidden ? 'away' : 'active' });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial sync
    setTimeout(() => {
      handleVisibilityChange();
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];
        if (videoTrack) sendSignalingMessage({ type: 'media-update', mediaType: 'video', enabled: videoTrack.enabled });
        if (audioTrack) sendSignalingMessage({ type: 'media-update', mediaType: 'audio', enabled: audioTrack.enabled });
      }
    }, 2000);
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [localStream]);

  return {
    localStream,
    remoteStreams,
    messages,
    participantsMetadata,
    isSharingScreen,
    isHandRaised,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRaiseHand,
    sendChatMessage,
    sendCaptionMessage,
    isHost: isHost.current,
    mediaError
  };
}
