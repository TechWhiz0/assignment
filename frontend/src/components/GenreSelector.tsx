
import React from 'react'
import { useMusicStore } from '../store/musicStore'

const genres = [
  { value: 'Pop', emoji: '🎤', color: 'from-pink-400 to-rose-400' },
  { value: 'Lo-fi', emoji: '🌙', color: 'from-purple-400 to-violet-400' },
  { value: 'Cinematic', emoji: '🎬', color: 'from-amber-400 to-orange-400' },
  { value: 'EDM', emoji: '🔊', color: 'from-cyan-400 to-blue-400' },
]

const GenreSelector = () => {
  const { selectedGenre, setSelectedGenre } = useMusicStore()

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Genre
      </label>
      <div className="grid grid-cols-2 gap-3">
        {genres.map((genre) => (
          <button
            key={genre.value}
            onClick={() => setSelectedGenre(genre.value)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-300
              ${selectedGenre === genre.value
                ? 'border-purple-400 bg-purple-500/20 scale-105'
                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
              }
            `}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl">{genre.emoji}</span>
              <span className="text-sm font-medium text-white">{genre.value}</span>
            </div>
            {selectedGenre === genre.value && (
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${genre.color} opacity-10`} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default GenreSelector
