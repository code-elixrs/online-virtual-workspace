import React, { useRef, useEffect, useState } from 'react';

const VideoFeed = ({ 
  stream, 
  sessionId, 
  userName, 
  isLocal = false, 
  isVideoEnabled = true, 
  isAudioEnabled = true,
  isSpeaking = false,
  className = "",
  showControls = false,
  onToggleVideo,
  onToggleAudio,
  isFullscreen = false
}) => {
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`🎬 Attaching stream for ${isLocal ? 'local' : 'remote'} user:`, userName);
      
      videoRef.current.srcObject = stream;
      
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        console.log(`✅ Video metadata loaded for ${userName}`);
        setIsVideoPlaying(true);
      };
      
      const handleCanPlay = () => {
        console.log(`▶️ Video can play for ${userName}`);
        video.play().catch(error => {
          console.warn(`⚠️ Autoplay failed for ${userName}:`, error);
        });
      };
      
      const handleError = (error) => {
        console.error(`❌ Video error for ${userName}:`, error);
        setIsVideoPlaying(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [stream, userName, isLocal]);

  // Check for video track
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      setHasVideoTrack(!!videoTrack);
      
      if (videoTrack) {
        console.log(`🎥 Video track for ${userName}:`, {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          kind: videoTrack.kind
        });
      }
    }
  }, [stream, userName]);

  // Determine if video should be visible
  const shouldShowVideo = hasVideoTrack && isVideoEnabled && isVideoPlaying;
  const showPlaceholder = !shouldShowVideo;

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-lg ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Prevent audio feedback on local video
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          shouldShowVideo ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ display: shouldShowVideo ? 'block' : 'none' }}
      />
      
      {/* Video Placeholder/Avatar */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <div className={`${
              isFullscreen ? 'w-24 h-24' : 'w-16 h-16'
            } bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3`}>
              <svg className={`${isFullscreen ? 'w-12 h-12' : 'w-8 h-8'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div className={`${isFullscreen ? 'text-lg' : 'text-sm'} font-medium mb-1`}>
              {userName}
            </div>
            <div className={`${isFullscreen ? 'text-sm' : 'text-xs'} text-gray-400`}>
              {!hasVideoTrack ? 'No Camera' : 'Camera Off'}
            </div>
          </div>
        </div>
      )}
      
      {/* User Info Overlay - Only show when video is playing */}
      {shouldShowVideo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Speaking Indicator */}
              {isSpeaking && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              
              {/* User Name */}
              <span className={`text-white font-medium truncate ${
                isFullscreen ? 'text-base' : 'text-sm'
              }`}>
                {userName} {isLocal && '(You)'}
              </span>
            </div>
            
            {/* Audio/Video Status Indicators */}
            <div className="flex items-center space-x-1">
              {/* Audio Indicator */}
              <div className={`${isFullscreen ? 'p-1.5' : 'p-1'} rounded ${
                isAudioEnabled ? 'bg-green-600/80' : 'bg-red-600/80'
              }`}>
                <svg className={`${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} text-white`} fill="currentColor" viewBox="0 0 20 20">
                  {isAudioEnabled ? (
                    <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M2.293 2.293a1 1 0 011.414 0L7 5.586V4a3 3 0 116 0v4c0 .657-.19 1.269-.515 1.786l1.48 1.48A7.001 7.001 0 0017 8a1 1 0 10-2 0 5.002 5.002 0 01-3.515 4.786L9.707 10.707A3.001 3.001 0 0113 8V4a1 1 0 00-2 0v4a1 1 0 01-1 1 .999.999 0 01-.707-.293L2.293 2.293a1 1 0 000 1.414z" clipRule="evenodd" />
                  )}
                </svg>
              </div>
              
              {/* Video Indicator */}
              <div className={`${isFullscreen ? 'p-1.5' : 'p-1'} rounded ${
                isVideoEnabled && hasVideoTrack ? 'bg-green-600/80' : 'bg-red-600/80'
              }`}>
                <svg className={`${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoEnabled && hasVideoTrack ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-5-4v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m0 12.728L18.364 5.636" />
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Connection Status Indicator */}
      {!isLocal && (
        <div className="absolute top-2 right-2">
          <div className={`w-2 h-2 rounded-full ${
            isVideoPlaying ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
          }`} title={isVideoPlaying ? 'Connected' : 'Connecting...'} />
        </div>
      )}
    </div>
  );
};

export default VideoFeed;