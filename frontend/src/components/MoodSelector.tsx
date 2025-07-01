
import React from 'react'
import { useMusicStore } from '../store/musicStore'

const moods = [
  { value: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
  { value: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-400' },
  { value: 'Energetic', emoji: '⚡', color: 'from-red-400 to-pink-400' },
  { value: 'Chill', emoji: '😎', color: 'from-green-400 to-teal-400' },
]

const MoodSelector = () => {
  const { selectedMood, setSelectedMood } = useMusicStore()

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Mood
      </label>
      <div className="grid grid-cols-2 gap-3">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => setSelectedMood(mood.value)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-300
              ${selectedMood === mood.value
                ? 'border-purple-400 bg-purple-500/20 scale-105'
                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
              }
            `}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-sm font-medium text-white">{mood.value}</span>
            </div>
            {selectedMood === mood.value && (
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${mood.color} opacity-10`} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MoodSelector
