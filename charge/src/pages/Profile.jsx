import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("Stored user:", localStorage.getItem("user"));

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch profile when user is available
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.id) {
        console.error("User is not defined or missing an ID");
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/profiles/${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false); // Stop loading when fetch is done
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]); // Run when `user` changes

  if (loading) {
    return <p>Loading profile...</p>;
  }

  if (!profile) {
    return <p>Profile not found.</p>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <img src={profile.avatar_url} alt="Avatar" width={100} />
      <p>Bio: {profile.bio}</p>
      <p>Favorite Nation: {profile.favorite_nation}</p>
      <p>Preferred Game Mode: {profile.preferred_game_mode}</p>
      <p>Playstyle: {profile.playstyle}</p>
      <p>Total Games: {profile.total_games}</p>
      <p>Wins: {profile.wins}</p>
      <p>Losses: {profile.losses}</p>
    </div>
  );
}