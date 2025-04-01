import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GameList from "./pages/GameList";
import GameAdd from "./pages/GameAdd";
import GameDetails from "./pages/GameDetails";
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<GameList />} />
        <Route path="/host-game" element={<GameAdd />} />
        <Route path="/game/:gameId" element={<GameDetails />} /> {/* Game details page route */}
        <Route path="/test" element={<Navbar />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  )
}

export default App
