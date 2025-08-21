// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import React from 'react';
import './index.css';

// The main App component will be our root for the entire application.
// For now, it's just a placeholder to show everything is working.
const App = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="text-center p-8 rounded-lg shadow-lg bg-gray-800 border border-gray-700">
        <h1 className="text-3xl font-bold mb-4">Online Virtual Workplace</h1>
        <p className="text-lg">Project setup complete. Let's start building!</p>
        <p className="text-sm mt-2 text-gray-400">Next Task: Implement the Lobby View.</p>
      </div>
    </div>
  );
};

export default App;
