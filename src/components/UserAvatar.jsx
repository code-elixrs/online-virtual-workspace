const UserAvatar = ({ name, style }) => {
  return (
    <div
      className="flex flex-col items-center justify-center p-1 bg-purple-600 text-white rounded-full w-16 h-16 border-4 border-purple-400 shadow-xl cursor-pointer absolute transition-all duration-500 ease-in-out z-10"
      style={style}
    >
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );
};
export default UserAvatar;