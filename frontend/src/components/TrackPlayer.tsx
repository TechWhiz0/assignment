
import React, { useRef, useState, useEffect } from 'react'
import { useMusicStore, Track } from '../store/musicStore'
import { Play, Pause, Download, Heart } from 'lucide-react'

interface TrackPlayerProps {
  track: Track
}

const TrackPlayer = ({ track }: TrackPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const { addLikedTrack, removeLikedTrack, isTrackLiked } = useMusicStore()
  const isLiked = isTrackLiked(track.id)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [track])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleLike = () => {
    if (isLiked) {
      removeLikedTrack(track.id)
    } else {
      addLikedTrack(track)
    }
  }

  const downloadTrack = () => {
    const link = document.createElement('a')
    link.href = track.url
    link.download = `${track.title}.mp3`
    link.click()
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
      <audio ref={audioRef} src={track.url} preload="metadata" />
      
      {/* Track Info */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{track.title}</h3>
        <div className="flex space-x-3">
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
            {track.mood}
          </span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
            {track.genre}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-6">
        <button
          onClick={togglePlay}
          className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 shadow-lg"
        >
          {isPlaying ? (
            <Pause className="text-white" size={24} />
          ) : (
            <Play className="text-white ml-1" size={24} />
          )}
        </button>

        <button
          onClick={downloadTrack}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
        >
          <Download className="text-white" size={20} />
        </button>

        <button
          onClick={toggleLike}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
            isLiked 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Heart 
            className={`${isLiked ? 'text-white fill-current' : 'text-white'}`} 
            size={20} 
          />
        </button>
      </div>
    </div>
  )
}

export default TrackPlayer
