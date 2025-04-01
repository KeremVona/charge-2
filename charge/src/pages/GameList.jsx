import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const socket = io("http://localhost:5000"); // WebSocket connection

const GameList = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null); // Store logged-in user info
  const navigate = useNavigate();

  // Check if the user is logged in
  const checkUserLogin = () => {
    const storedUser = localStorage.getItem("user");
    console.log("Stored user data:", storedUser); // Debug log

    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            
            if (!parsedUser.id) {
                console.error("User ID is missing in stored user data:", parsedUser);
                return;
            }

            setUser(parsedUser);
            console.log("User logged in:", parsedUser); // Confirm login in console
        } catch (error) {
            console.error("Error parsing stored user data:", error);
        }
    }
  };

  // Fetch game list from the backend
  const fetchGames = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/games");
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  useEffect(() => {
    fetchGames(); // Fetch initial game list
    checkUserLogin(); // Check if user is logged in
  
    // Listen for game updates via WebSockets
    socket.on("updateGames", (updatedGames) => {
      setGames(updatedGames);
    });
  
    return () => {
      socket.off("updateGames"); // Cleanup WebSocket listener on unmount
    };
  }, []);

  const handleJoinGame = async (gameId) => {
    if (!user) {
      alert("You must be logged in to join a game.");
      return;
    }

    const requestData = {
      userId: user.id,
      username: user.username,
    };

    console.log("Let's see ", requestData);

    try {
      const response = await fetch(`http://localhost:5000/api/games/${gameId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, username: user.username }),
      });

      if (response.ok) {
        fetchGames(); // Refresh game list to update player count
      } else {
        console.error("Failed to join the game.");
        alert("Hint: You can't join twice")
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };

  // TEMPORARY, delete functionality for test
  const handleDeleteGame = async (id) => {
    try {
        await fetch(`http://localhost:5000/api/games/${id}`, { method: "DELETE" });
        setGames(games.filter(game => game.id !== id));
    } catch (error) {
        console.error("Error deleting game:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Header />
      <h1 className="text-2xl font-bold mb-4">Game List</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <div key={game.id} className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold">
              <Link to={`/game/${game.id}`} className="text-blue-500 hover:underline">
                Host: {game.host}
              </Link>
            </h2>
            <p>Status: <span className={game.status === "hosted" ? "text-green-400" : "text-yellow-400"}>{game.status}</span></p>
            <p>Players: {game.player_count}</p>
            {game.room_id && <p>Room ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{game.room_id}</span></p>}
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
              onClick={() => handleJoinGame(game.id)}
            >
              Join
            </button>

            <button 
              className="mt-2 ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700" 
              onClick={() => handleDeleteGame(game.id)}
            >
              Delete
            </button>

            {/* New Fields for Historical and Modded Status */}
            <p>Type: 
              <span className={game.is_historical ? "text-blue-400" : "text-red-400"}>
                {game.is_historical ? "Historical" : "Unhistorical"}
              </span>
            </p>
            <p>Mod Status: 
              <span className={game.is_modded ? "text-purple-400" : "text-green-400"}>
                {game.is_modded ? "Modded" : "Vanilla"}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameList;