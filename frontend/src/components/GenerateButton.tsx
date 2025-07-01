
import React from 'react'
import { useMusicStore } from '../store/musicStore'
import { mockTracks } from '../data/mockTracks'

const GenerateButton = () => {
  const { 
    selectedMood, 
    selectedGenre, 
    isLoading, 
    setLoading, 
    setCurrentTrack, 
    addRecentTrack 
  } = useMusicStore()

  const generateTrack = async () => {
    setLoading(true)
    
    // Simulate API call with 2-second delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Filter tracks by mood and genre
    const filteredTracks = mockTracks.filter(
      track => track.mood === selectedMood && track.genre === selectedGenre
    )
    
    // If no exact match, use all tracks
    const availableTracks = filteredTracks.length > 0 ? filteredTracks : mockTracks
    
    // Select random track
    const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
    
    setCurrentTrack(randomTrack)
    addRecentTrack(randomTrack)
    setLoading(false)
  }

  return (
    <button
      onClick={generateTrack}
      disabled={isLoading}
      className={`
        w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300
        ${isLoading
          ? 'bg-gray-600 cursor-not-allowed'
          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
        }
        text-white shadow-lg hover:shadow-xl
      `}
    >
      {isLoading ? (
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span>Generating your vibe...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <span>🔁</span>
          <span>Generate Music Preview</span>
        </div>
      )}
    </button>
  )
}

export default GenerateButton
