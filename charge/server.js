import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import authRoutes from "./authRoutes.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import pool from "./db.js"; // PostgreSQL database connection
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // React frontend URL
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// Fetch all games
app.get("/api/games", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM games");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/games", async (req, res) => {
  const { host, status, player_count, room_id, rules, is_historical, is_modded } = req.body;

  try {
    const newGameId = uuidv4(); // Generate a unique ID

    const { rows } = await pool.query(
      "INSERT INTO games (id, host, status, player_count, room_id, rules, is_historical, is_modded) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [newGameId, host, status, player_count, room_id, JSON.stringify(rules), is_historical, is_modded]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TEMPORARY, delete functionality for test
app.delete('/api/games/:id', async (req, res) => {
  try {
      const { id } = req.params;
      await pool.query("DELETE FROM games WHERE id = $1", [id]);
      res.json({ message: "Game deleted successfully" });
  } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
  }
});

// Fetch game details by ID
app.get("/api/games/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch game details
    const result = await pool.query("SELECT * FROM games WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    
    const game = result.rows[0];

    const hostResult = await pool.query(
      "SELECT username FROM users WHERE id = $1", 
      [game.host]
    );
    
    const hostUsername = hostResult.rows[0]?.username || "Unknown";

    // Fetch players for this game
    const playersResult = await pool.query(
      "SELECT username FROM game_players WHERE game_id = $1",
      [id]
    );

    res.json({
      ...game,
      host: hostUsername,
      players: playersResult.rows.map((player) => player.username),
      player_count: game.player_count,
      rules: typeof game.rules === 'string' ? JSON.parse(game.rules) : game.rules || { general: [], countrySpecific: {} },
      plannedTime: game.planned_time,
      isHistorical: game.is_historical,
      isModded: game.is_modded,
    });
  } catch (err) {
    console.error("Error fetching game details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/profiles/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(result.rows[0]); // Send profile data
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch profile data
app.get("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = result.rows[0];
    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/profile/update", async (req, res) => {
  const { user_id, avatar_url, bio, favorite_nation, preferred_game_mode, playstyle, total_games, wins, losses } = req.body;

  try {
    await pool.query(
      `UPDATE profiles SET 
        avatar_url = $1,
        bio = $2,
        favorite_nation = $3,
        preferred_game_mode = $4,
        playstyle = $5,
        total_games = $6,
        wins = $7,
        losses = $8
      WHERE user_id = $9`,
      [avatar_url, bio, favorite_nation, preferred_game_mode, playstyle, total_games, wins, losses, user_id]
    );

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ FIXED: Join game (adds player to game_players & updates count)
app.post("/api/games/:id/join", async (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;

  try {
    // Check if the user already joined
    const existingPlayer = await pool.query(
      "SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existingPlayer.rows.length > 0) {
      return res.status(400).json({ error: "You have already joined this game." });
    }

    // Insert player into game_players
    await pool.query(
      "INSERT INTO game_players (game_id, user_id, username) VALUES ($1, $2, $3)",
      [id, userId, username]
    );

    // Update player count
    const updatedGame = await pool.query(
      "UPDATE games SET player_count = player_count + 1 WHERE id = $1 RETURNING *",
      [id]
    );

    // Emit updated game to WebSocket clients
    io.emit("updateGame", updatedGame.rows[0]);

    res.json({ success: true, message: "Joined the game successfully!" });
  } catch (err) {
    console.error("Error joining game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:id/leave", async (req, res) => {
  const { id } = req.params; // Game ID
  const { userId } = req.body; // User ID from frontend

  try {
    // Check if the user is in the game
    const existingPlayer = await pool.query(
      "SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existingPlayer.rows.length === 0) {
      return res.status(400).json({ error: "You are not in this game." });
    }

    // Remove player from game_players table
    await pool.query("DELETE FROM game_players WHERE game_id = $1 AND user_id = $2", [id, userId]);

    // Update player count in games table
    const updatedGame = await pool.query(
      "UPDATE games SET player_count = player_count - 1 WHERE id = $1 RETURNING *",
      [id]
    );

    // Emit update via WebSockets
    io.emit("updateGame", updatedGame.rows[0]);

    res.json({ success: true, message: "Left the game successfully!" });
  } catch (err) {
    console.error("Error leaving game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:id/kick", async (req, res) => {
  const { id } = req.params; // Game ID
  const { hostId, playerId } = req.body; // Host and player being kicked

  try {
    // Check if the requester is the host
    const game = await pool.query("SELECT host FROM games WHERE id = $1", [id]);
    if (game.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (game.rows[0].host !== hostId) {
      return res.status(403).json({ error: "Only the host can kick players" });
    }

    // Remove player from game_players
    await pool.query("DELETE FROM game_players WHERE game_id = $1 AND user_id = $2", [id, playerId]);

    // Update player count
    await pool.query("UPDATE games SET player_count = player_count - 1 WHERE id = $1", [id]);

    // Fetch updated player list
    const updatedPlayers = await pool.query("SELECT username FROM game_players WHERE game_id = $1", [id]);

    // Broadcast update to all clients
    io.emit("updatePlayers", { gameId: id, players: updatedPlayers.rows });

    res.json({ success: true, message: "Player kicked successfully" });
  } catch (err) {
    console.error("Error kicking player:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

io.on("connection", (socket) => {
  console.log("A user connected to WebSocket");

  socket.on("addGame", async (newGame) => {
    try {
      await pool.query(
        "INSERT INTO games (host, status, player_count, room_id, rules, is_historical, is_modded) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          newGame.host,
          newGame.status,
          newGame.player_count,
          newGame.room_id,
          JSON.stringify(newGame.rules),
          newGame.is_historical, // Include historical status
          newGame.is_modded, // Include modded status
        ]
      );
  
      // Fetch updated game list and broadcast it
      const updatedGames = await pool.query("SELECT * FROM games");
      io.emit("updateGames", updatedGames.rows);
    } catch (err) {
      console.error("Error adding game:", err);
    }
  });

  socket.on("kickPlayer", async ({ gameId, playerUsername }) => { // ✅ FIX: Destructure the object
    try {
        const gameIdInt = parseInt(gameId, 10); // Ensure gameId is an integer
        if (isNaN(gameIdInt)) {
            throw new Error("Invalid game ID");
        }

        console.log(`Kicking player: ${playerUsername} from game ID: ${gameIdInt}`);

        // Check if the user is the host
        const gameResult = await pool.query("SELECT host FROM games WHERE id = $1", [gameIdInt]);
        const game = gameResult.rows[0];

        if (game && game.host === playerUsername) {
            // Don't allow the host to kick themselves
            return socket.emit("error", "Host cannot kick themselves");
        }

        // Remove the player from the game
        await pool.query(
            "DELETE FROM game_players WHERE game_id = $1 AND username = $2",
            [gameIdInt, playerUsername]
        );

        // Update player count
        await pool.query(
            "UPDATE games SET player_count = player_count - 1 WHERE id = $1",
            [gameIdInt]
        );

        // Fetch the updated game details
        const updatedGame = await pool.query("SELECT * FROM games WHERE id = $1", [gameIdInt]);

        io.emit("updateGame", updatedGame.rows[0]); // Emit updated game data
    } catch (err) {
        console.error("Error kicking player:", err);
    }
});
  

  socket.on("updateGame", async (updatedGame) => {
    try {
      await pool.query(
        "UPDATE games SET rules = $1, planned_time = $2, is_historical = $3, is_modded = $4 WHERE id = $5",
        [
          JSON.stringify(updatedGame.rules),
          updatedGame.plannedTime,
          updatedGame.isHistorical,
          updatedGame.isModded,
          updatedGame.id,
        ]
      );
  
      // Fetch the full updated game from the database before broadcasting
      const result = await pool.query("SELECT * FROM games WHERE id = $1", [updatedGame.id]);
      const fullGame = result.rows[0];
  
      // Ensure rules are properly parsed
      fullGame.rules = fullGame.rules ? JSON.parse(fullGame.rules) : { general: [], countrySpecific: {} };
  
      io.emit("updateGame", fullGame);
    } catch (err) {
      console.error("Error updating game:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from WebSocket");
  });
});

//server.listen(5001, () => console.log("Server running on port 5001"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));