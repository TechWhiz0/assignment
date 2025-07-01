
import React from 'react'
import { useMusicStore } from '../store/musicStore'
import MoodSelector from '../components/MoodSelector'
import GenreSelector from '../components/GenreSelector'
import GenerateButton from '../components/GenerateButton'
import TrackPlayer from '../components/TrackPlayer'
import RecentTracks from '../components/RecentTracks'

const Index = () => {
  const { currentTrack, likedTracks } = useMusicStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Wubble QuickTune Mini 🎧
          </h1>
          <p className="text-gray-300 text-lg">
            AI-powered music preview generator for every mood and moment
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Controls */}
          <div className="space-y-6">
            <MoodSelector />
            <GenreSelector />
            <GenerateButton />
          </div>

          {/* Track Player */}
          <div className="flex flex-col">
            {currentTrack ? (
              <TrackPlayer track={currentTrack} />
            ) : (
              <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 border-dashed flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-gray-400 text-center text-lg mb-2">
                  No track generated yet
                </p>
                <p className="text-gray-500 text-center">
                  Select your mood and genre, then hit Generate!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-gray-800/30 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center space-x-6 text-gray-300">
            <div className="flex items-center space-x-2">
              <span>❤️</span>
              <span>{likedTracks.length} Liked</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🎵</span>
              <span>AI-Generated Previews</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-0">
            <span className="text-gray-400 text-sm">Powered by Wubble AI</span>
          </div>
        </div>

        {/* Recent Tracks Section */}
        <RecentTracks />
      </div>
    </div>
  )
}

export default Index
