
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Track {
  id: string
  title: string
  url: string
  mood: string
  genre: string
  duration?: string
}

interface MusicState {
  currentTrack: Track | null
  likedTracks: Track[]
  recentTracks: Track[]
  isLoading: boolean
  isPlaying: boolean
  selectedMood: string
  selectedGenre: string
  setCurrentTrack: (track: Track | null) => void
  addLikedTrack: (track: Track) => void
  removeLikedTrack: (trackId: string) => void
  addRecentTrack: (track: Track) => void
  setLoading: (loading: boolean) => void
  setPlaying: (playing: boolean) => void
  setSelectedMood: (mood: string) => void
  setSelectedGenre: (genre: string) => void
  isTrackLiked: (trackId: string) => boolean
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      likedTracks: [],
      recentTracks: [],
      isLoading: false,
      isPlaying: false,
      selectedMood: 'Happy',
      selectedGenre: 'Pop',
      
      setCurrentTrack: (track) => set({ currentTrack: track }),
      
      addLikedTrack: (track) => set((state) => ({
        likedTracks: [...state.likedTracks.filter(t => t.id !== track.id), track]
      })),
      
      removeLikedTrack: (trackId) => set((state) => ({
        likedTracks: state.likedTracks.filter(t => t.id !== trackId)
      })),
      
      addRecentTrack: (track) => set((state) => ({
        recentTracks: [track, ...state.recentTracks.filter(t => t.id !== track.id)].slice(0, 10)
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setSelectedMood: (mood) => set({ selectedMood: mood }),
      setSelectedGenre: (genre) => set({ selectedGenre: genre }),
      
      isTrackLiked: (trackId) => get().likedTracks.some(t => t.id === trackId),
    }),
    {
      name: 'wubble-music-storage',
      partialize: (state) => ({
        likedTracks: state.likedTracks,
        recentTracks: state.recentTracks,
      }),
    }
  )
)
