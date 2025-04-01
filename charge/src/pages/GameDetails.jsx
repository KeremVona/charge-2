import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Button1 from '../components/Button';
import Header from '../components/Header';
import io from 'socket.io-client';

const GameDetails = () => {
  const { gameId } = useParams(); // Get the gameId from the URL
  const navigate = useNavigate(); // Hook to navigate programmatically
  console.log("gameId from URL:", gameId); // Check if it's being passed correctly
  const [user, setUser] = useState(null);

  const [gameDetails, setGameDetails] = useState(null);
  const [players, setPlayers] = useState([]);
  const [socket, setSocket] = useState(null);

  const fetchGameDetails = async () => {
    if (!gameId) return;
    
    const url = `http://localhost:5000/api/games/${gameId}`;
    console.log("Fetching from URL:", url);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        console.error("Error response:", text);
        return;
      }
      const data = await response.json();
      console.log("Game details fetched:", data);
      setGameDetails(data || {});
      setPlayers(data.players || []); // Ensure players list is set
    } catch (error) {
      console.error("Error fetching game details:", error);
    }
  };

  useEffect(() => {
    console.log("Players array:", players); // Debugging
    const socketConnection = io('http://localhost:5000'); // Adjust the URL as needed
    setSocket(socketConnection); // Set the socket connection
    // Fetch user from localStorage
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser); // Define parsedUser
    console.log("Loaded user:", parsedUser);
    setUser(parsedUser);
  }
  
    fetchGameDetails(); // Call it here too

    return () => {
      socketConnection.disconnect(); // Clean up on unmount
    };
  }, [gameId]);

  // Function to leave the game
const handleLeaveGame = async () => {
  if (!user) {
    alert("You must be logged in to leave a game.");
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/games/${gameId}/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (response.ok) {
      fetchGameDetails(); // Refresh game details after leaving
    } else {
      console.error("Failed to leave the game.");
    }
  } catch (error) {
    console.error("Error leaving game:", error);
  }
};



const handleKickPlayer = async (playerUsername) => {
  if (!playerUsername) {
    console.error("Player username is undefined");
    return;
  }
  if (!socket) {
    console.error("Socket is not defined.");
    return;
  }
  if (!gameDetails?.id) {
    console.error("Game ID is undefined.");
    return;
  }

  console.log("Kicking player:", playerUsername, "from game ID:", gameDetails.id);
  
  socket.emit("kickPlayer", { gameId: gameDetails.id, playerUsername });
};

  if (!gameDetails) {
    return <div>Loading game details...</div>;
  }

console.log("Game Host Username:", gameDetails.host);
console.log("Current User Username:", user?.username);

  return (
    <>
    <Header />
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold text-center mb-4">Game Details</h1>
      
      <div className="space-y-4">
        <p className="text-lg"><strong>Host:</strong> {gameDetails.host}</p>
        <p className="text-lg"><strong>Status:</strong> {gameDetails.status}</p>
        <p className="text-lg"><strong>Player Count:</strong> {gameDetails.player_count}</p>
      </div>

        {/* Player List */}
      <h2 className="text-2xl font-semibold mt-6">Players</h2>
      <ul className="list-disc pl-6">
        {gameDetails.players && gameDetails.players.length > 0 ? (
          gameDetails.players.map((player, index) => (
            <li key={index} className="text-lg">{player}</li>
          ))
        ) : (
          <p>No players joined yet.</p>
        )}
      </ul>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-2">Rules</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium">General Rules</h3>
            <ul className="list-disc pl-5">
              {gameDetails.rules.general && gameDetails.rules.general.map((rule, index) => (
                <li key={index} className="text-lg">{rule}</li>
              ))}
            </ul>
          </div>
          {gameDetails?.host && user && gameDetails.host === user.id && (
  <button className="bg-blue-500 text-white px-4 py-2 rounded">
    Host Controls
  </button>
)}
          <ul>
            
          {players.map((player, index) => (
  <div key={index} className="flex justify-between items-center">
    <span>{player.username || player}</span>
    {gameDetails.host === user?.username && ( // Compare host by username
      <button 
        onClick={() => handleKickPlayer(player.username || player)}
        className="bg-red-600 text-white px-2 py-1 rounded"
      >
        Kick
      </button>
    )}
  </div>
))}
</ul>

          <div>
            <h3 className="text-xl font-medium">Country-Specific Rules</h3>
            <ul className="list-disc pl-5">
              {Object.entries(gameDetails.rules.countrySpecific).map(([country, rule], index) => (
                <li key={index} className="text-lg">{country}: {rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        
        <Button1 />
        {user && (
      <button onClick={handleLeaveGame} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
        Leave Game
      </button>
    )}
      </div>
    </div>
    </>
  );
};

export default GameDetails;