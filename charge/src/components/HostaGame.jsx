import React from 'react'
import { useNavigate } from 'react-router-dom';

export default function HostaGame() {
    const navigate = useNavigate();
  return (
    <>
        {/* Base - Right */}
        <button onClick={() => useNavigate("/host-game")}>
        <a
  className="inline-block rounded-sm bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:rotate-2 focus:ring-3 focus:outline-hidden"
  href='/host-game'
>
  Host a Game
</a>
        </button>

    </>
  )
}
