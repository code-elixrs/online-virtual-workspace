import React, { useMemo } from 'react';
import VideoFeed from './VideoFeed';

const VideoGrid = ({
  localStream,
  remoteStreams,
  currentUser,
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  className = ""
}) => {
  console.log('🎬 VideoGrid render:', {
    hasLocal: !!localStream,
    remoteCount: remoteStreams.size,
    user: currentUser?.name
  });

  // Calculate grid layout based on participant count
  const { gridCols, gridRows, participantCount } = useMemo(() => {
    const totalParticipants = (localStream ? 1 : 0) + remoteStreams.size;
    
    let cols, rows;
    
    if (totalParticipants <= 1) {
      cols = 1; rows = 1;
    } else if (totalParticipants <= 2) {
      cols = 2; rows = 1;
    } else if (totalParticipants <= 4) {
      cols = 2; rows = 2;
    } else if (totalParticipants <= 6) {
      cols = 3; rows = 2;
    } else if (totalParticipants <= 9) {
      cols = 3; rows = 3;
    } else if (totalParticipants <= 12) {
      cols = 4; rows = 3;
    } else {
      // For larger groups, use a more dynamic approach
      cols = Math.ceil(Math.sqrt(totalParticipants));
      rows = Math.ceil(totalParticipants / cols);
    }
    
    return {
      gridCols: cols,
      gridRows: rows,
      participantCount: totalParticipants
    };
  }, [localStream, remoteStreams.size]);

  // Generate grid CSS classes
  const gridClasses = useMemo(() => {
    const baseClass = "grid gap-2 h-full w-full";
    const colsClass = `grid-cols-${gridCols}`;
    
    // For responsive design
    let responsiveClasses = "";
    if (gridCols > 2) {
      responsiveClasses = "sm:grid-cols-2 md:grid-cols-" + Math.min(gridCols, 3) + " lg:grid-cols-" + gridCols;
    } else {
      responsiveClasses = colsClass;
    }
    
    return `${baseClass} ${responsiveClasses}`;
  }, [gridCols]);

  // Calculate individual video feed size
  const feedClasses = useMemo(() => {
    if (participantCount === 1) {
      return "aspect-video max-w-2xl mx-auto"; // Large single video
    } else if (participantCount === 2) {
      return "aspect-video"; // Two videos side by side
    } else {
      return "aspect-video min-h-32"; // Grid layout
    }
  }, [participantCount]);

  if (participantCount === 0) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-5-4v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="text-lg font-medium">No Video Streams</div>
          <div className="text-sm">Camera access might be required</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${gridClasses} ${className}`}>
      {/* Local Video Feed */}
      {localStream && (
        <VideoFeed
          stream={localStream}
          sessionId={currentUser?.sessionId}
          userName={currentUser?.name || 'You'}
          isLocal={true}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          showControls={true}
          onToggleVideo={onToggleVideo}
          onToggleAudio={onToggleAudio}
          className={feedClasses}
        />
      )}
      
      {/* Remote Video Feeds */}
      {Array.from(remoteStreams.entries()).map(([sessionId, stream]) => (
        <VideoFeed
          key={sessionId}
          stream={stream}
          sessionId={sessionId}
          userName={`User ${sessionId.slice(-4)}`} // You might want to get real names from presence
          isLocal={false}
          isVideoEnabled={true} // Remote video state - might need to track this
          isAudioEnabled={true} // Remote audio state - might need to track this
          className={feedClasses}
        />
      ))}
    </div>
  );
};

export default VideoGrid;