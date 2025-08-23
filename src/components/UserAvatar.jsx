// const UserAvatar = ({ name, style, userId, isCurrentUser = false, userRoom, currentRoom }) => {
//   const isInDifferentRoom = !isCurrentUser && currentRoom === null && userRoom && userRoom !== 'Lobby';
  
//   return (
//     <div
//       className={`flex flex-col items-center justify-center p-1 rounded-full w-16 h-16 border-4 shadow-xl absolute transition-all duration-500 ease-in-out z-10 ${
//         isCurrentUser 
//           ? 'bg-blue-600 border-blue-400 cursor-pointer' 
//           : 'bg-purple-600 border-purple-400'
//       }`}
//       style={style}
//       title={`${name}${userRoom ? ` - In ${userRoom}` : ''}`}
//     >
//       <span className="text-white text-sm font-semibold truncate w-full text-center">{name}</span>
//       <span className="text-white text-[10px] opacity-80 truncate w-full text-center">
//         {isCurrentUser ? 'You' : (isInDifferentRoom ? userRoom : userId?.slice(-4))}
//       </span>
//       {isInDifferentRoom && (
//         <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
//       )}
//     </div>
//   );
// };

// const UserAvatar = ({ name, style, userId, sessionId, isCurrentUser = false, userRoom, currentRoom }) => {
//   const isInDifferentRoom = !isCurrentUser && currentRoom === null && userRoom && userRoom !== 'Lobby';
  
//   return (
//     <div
//       className={`flex flex-col items-center justify-center p-1 rounded-full w-16 h-16 border-4 shadow-xl absolute transition-all duration-500 ease-in-out z-10 ${
//         isCurrentUser 
//           ? 'bg-blue-600 border-blue-400 cursor-pointer' 
//           : 'bg-purple-600 border-purple-400'
//       }`}
//       style={style}
//       title={`${name}${userRoom ? ` - In ${userRoom}` : ''}${sessionId ? ` (${sessionId.slice(-6)})` : ''}`}
//     >
//       <span className="text-white text-sm font-semibold truncate w-full text-center">{name}</span>
//       <span className="text-white text-[10px] opacity-80 truncate w-full text-center">
//         {isCurrentUser ? 'You' : (isInDifferentRoom ? userRoom : `${userId?.slice(-4)}`)}
//       </span>
//       {isInDifferentRoom && (
//         <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
//       )}
//     </div>
//   );
// };

const UserAvatar = ({ name, style, sessionId, isCurrentUser = false, userRoom, currentRoom }) => {
  const isInDifferentRoom = !isCurrentUser && currentRoom === null && userRoom && userRoom !== 'Lobby';
  
  return (
    <div
      className={`flex flex-col items-center justify-center p-1 rounded-full w-16 h-16 border-4 shadow-xl absolute transition-all duration-500 ease-in-out z-10 ${
        isCurrentUser 
          ? 'bg-blue-600 border-blue-400 cursor-pointer' 
          : 'bg-purple-600 border-purple-400'
      }`}
      style={style}
      title={`${name}${userRoom ? ` - In ${userRoom}` : ''}${sessionId ? ` (${sessionId.slice(-6)})` : ''}`}
    >
      <span className="text-white text-sm font-semibold truncate w-full text-center">{name}</span>
      <span className="text-white text-[10px] opacity-80 truncate w-full text-center">
        {isCurrentUser ? 'You' : (isInDifferentRoom ? userRoom : sessionId?.slice(-4))}
      </span>
      {isInDifferentRoom && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
      )}
    </div>
  );
};
export default UserAvatar;