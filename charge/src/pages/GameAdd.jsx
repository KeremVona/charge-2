import { useState } from "react";
import { io } from "socket.io-client";
import Navbar from "../components/Navbar";
import Header from "../components/Header";
/*import Delete from "../components/Delete";*/

const socket = io("http://localhost:5000"); // WebSocket connection

const GameAdd = () => {
  const [host, setHost] = useState("");
  const [status, setStatus] = useState("planned");
  const [playerCount, setPlayerCount] = useState(1);
  const [roomId, setRoomId] = useState("");
  const [historical, setHistorical] = useState(true);
  const [modded, setModded] = useState(false);
  const [rules, setRules] = useState({
    general: ["Rule 1", "Rule 2"],
    countrySpecific: {
      Germany: ["Rule 1", "Rule 2"],
      Italy: ["Rule 1", "Rule 2"],
    },
  });

  const handleRuleChange = (category, index, value) => {
    setRules((prev) => {
      const updatedRules = { ...prev };
      if (category === "general") {
        updatedRules.general[index] = value;
      } else {
        updatedRules.countrySpecific[category][index] = value;
      }
      return updatedRules;
    });
  };

  const addGeneralRule = () => {
    setRules((prev) => ({ ...prev, general: [...prev.general, ""] }));
  };

  const handleDeleteRule = (category, index) => {
    setRules((prev) => {
      const updatedRules = { ...prev };
      if (category === "general") {
        updatedRules.general.splice(index, 1);
      } else {
        updatedRules.countrySpecific[category].splice(index, 1);
      }
      return { ...updatedRules };
    });
  };

  const addCountryRule = (country) => {
    setRules((prev) => {
      const updatedRules = { ...prev };
      updatedRules.countrySpecific[country].push("");
      return updatedRules;
    });
  };

  const addCountry = () => {
    const countryName = prompt("Enter country name:");
    if (countryName && !rules.countrySpecific[countryName]) {
      setRules((prev) => ({
        ...prev,
        countrySpecific: { ...prev.countrySpecific, [countryName]: ["Rule 1"] },
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const newGame = {
      id: crypto.randomUUID(), // Generate a unique ID in the frontend (optional)
      host,
      status,
      player_count: playerCount,
      room_id: roomId || null,
      rules,
      is_historical: historical,
      is_modded: modded,
    };
  
    socket.emit("addGame", newGame);
  
    setHost("");
    setStatus("planned");
    setPlayerCount(1);
    setRoomId("");
    setHistorical(false);
    setModded(false);
  };

  return (
    <div className="container mx-auto p-6">
      <Header />
      <h1 className="text-2xl font-bold mb-4">Host a New Game</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <div>
          <label htmlFor="host" className="block text-sm font-semibold text-gray-300">Host Name</label>
          <input
            type="text"
            id="host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md border border-gray-700 bg-gray-900 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-semibold text-gray-300">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md border border-gray-700 bg-gray-900 text-white"
          >
            <option value="planned">Planned</option>
            <option value="hosted">Hosted</option>
          </select>
        </div>

        <div className="flex gap-4">
          <label className="text-gray-300">
            <input className="mr-1"
              type="checkbox"
              checked={historical}
              onChange={() => setHistorical(!historical)}
            />
            Historical
          </label>
          <label className="text-gray-300">
            <input className="mr-1"
              type="checkbox"
              checked={modded}
              onChange={() => setModded(!modded)}
            />
            Modded
          </label>
        </div>

        <div>
          <label htmlFor="playerCount" className="block text-sm font-semibold text-gray-300">Player Count</label>
          <input
            type="number"
            id="playerCount"
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            min="1"
            className="mt-1 block w-full p-2 rounded-md border border-gray-700 bg-gray-900 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="roomId" className="block text-sm font-semibold text-gray-300">Room ID (Optional)</label>
          <input
            type="text"
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md border border-gray-700 bg-gray-900 text-white"
          />
        </div>

        <h3 className="text-xl font-semibold text-gray-300">Game Rules</h3>
        <div>
          <h4 className="font-medium text-gray-300">General Rules</h4>
          {rules.general.map((rule, index) => (
            <div key={index} className="flex gap-2 items-center text-gray-300">
            <input
              type="text"
              value={rule}
              onChange={(e) => handleRuleChange("general", index, e.target.value)}
              className="w-full p-2 border rounded mt-2 bg-blue-700"
            />
            <button onClick={() => handleDeleteRule("general", index)} className="bg-red-500 text-white px-2 py-1 rounded">X</button>
          </div>
          ))}
          <button type="button" onClick={addGeneralRule} className="bg-gray-500 text-white p-2 rounded mt-2">
            Add General Rule
          </button>
        </div>
        
        {Object.keys(rules.countrySpecific).map((country) => (
          <div key={country} className="text-gray-300">
            <h4 className="font-medium mt-4">{country}</h4>
            {rules.countrySpecific[country].map((rule, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={rule}
                  onChange={(e) => handleRuleChange(country, index, e.target.value)}
                  className="w-full p-2 border rounded mt-2 bg-blue-700"
                />
                <button onClick={() => handleDeleteRule(country, index)} className="bg-red-500 text-white px-2 py-1 rounded">X</button>
            </div>
            ))}
            <button type="button" onClick={() => addCountryRule(country)} className="bg-gray-500 text-white p-2 rounded mt-2">
              Add Rule for {country}
            </button>
          </div>
        ))}

        <button type="button" onClick={addCountry} className="bg-green-500 text-white p-2 rounded mt-2">
          Add Country
        </button>

        <button
          type="submit"
          className="w-full mt-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
        >
          Make Game
        </button>
      </form>
    </div>
  );
};

export default GameAdd;