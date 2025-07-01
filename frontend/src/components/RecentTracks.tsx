
import React from 'react'
import { Play } from 'lucide-react'
import { useMusicStore } from '../store/musicStore'

const RecentTracks = () => {
  const { recentTracks, setCurrentTrack } = useMusicStore()

  if (recentTracks.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🕘</span>
        Recent Tracks
      </h3>
      <div className="space-y-2">
        {recentTracks.slice(0, 5).map((track) => (
          <button
            key={track.id}
            onClick={() => setCurrentTrack(track)}
            className="w-full p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-300 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{track.title}</p>
                <p className="text-gray-400 text-sm">{track.mood} • {track.genre}</p>
              </div>
              <div className="text-gray-500">
                <Play size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default RecentTracks
