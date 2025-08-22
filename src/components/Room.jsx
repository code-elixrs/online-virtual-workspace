const Room = ({ name, onClick, isSelected, isLocked }) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl shadow-md cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-2xl
        ${isSelected ? 'border-4 border-blue-400 transform scale-110 bg-blue-600' : 'border border-gray-600 bg-gray-700'}
      `}
      onClick={onClick}
    >
      <svg className="w-12 h-12 text-white mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zM4 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
      </svg>
      {isLocked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 00-6 0v2h6z" clipRule="evenodd"></path>
          </svg>
        </div>
      )}
      <span className="text-md font-bold text-white text-center">{name}</span>
    </div>
  );
};

export default Room;