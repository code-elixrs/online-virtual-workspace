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

  // Calculate grid layout
  const { gridLayout, participantCount } = useMemo(() => {
    const totalParticipants = (localStream ? 1 : 0) + remoteStreams.size;
    
    let gridCols = 'grid-cols-1';
    let aspectClass = 'aspect-video';
    
    if (totalParticipants <= 1) {
      gridCols = 'grid-cols-1';
      aspectClass = 'aspect-video';
    } else if (totalParticipants === 2) {
      gridCols = 'grid-cols-1 md:grid-cols-2';
      aspectClass = 'aspect-video';
    } else if (totalParticipants <= 4) {
      gridCols = 'grid-cols-2';
      aspectClass = 'aspect-video';
    } else if (totalParticipants <= 6) {
      gridCols = 'grid-cols-2 md:grid-cols-3';
      aspectClass = 'aspect-video';
    } else {
      gridCols = 'grid-cols-3 md:grid-cols-4';
      aspectClass = 'aspect-video';
    }
    
    return {
      gridLayout: `grid ${gridCols} gap-2 h-full w-full`,
      aspectClass,
      participantCount: totalParticipants
    };
  }, [localStream, remoteStreams.size]);

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
         <div className="text-sm">Click the camera button to start video</div>
       </div>
     </div>
   );
 }

 return (
   <div className={`${gridLayout} ${className}`}>
     {/* Local Video Feed */}
     {localStream && (
       <div className="min-h-0">
         <VideoFeed
           stream={localStream}
           sessionId={currentUser?.sessionId}
           userName={currentUser?.name || 'You'}
           isLocal={true}
           isVideoEnabled={isVideoEnabled}
           isAudioEnabled={isAudioEnabled}
           showControls={false} // Controls are in RoomControls now
           onToggleVideo={onToggleVideo}
           onToggleAudio={onToggleAudio}
           className="h-full w-full"
         />
       </div>
     )}
     
     {/* Remote Video Feeds */}
     {Array.from(remoteStreams.entries()).map(([sessionId, stream]) => (
       <div key={sessionId} className="min-h-0">
         <VideoFeed
           stream={stream}
           sessionId={sessionId}
           userName={`User ${sessionId.slice(-4)}`}
           isLocal={false}
           isVideoEnabled={true} // Remote streams are enabled if we receive them
           isAudioEnabled={true}
           className="h-full w-full"
         />
       </div>
     ))}
   </div>
 );
};

export default VideoGrid;