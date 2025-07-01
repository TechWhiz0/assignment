
const API_BASE_URL = 'http://localhost:3001/api'

export const apiService = {
  async getMoods() {
    const response = await fetch(`${API_BASE_URL}/moods`)
    if (!response.ok) throw new Error('Failed to fetch moods')
    return response.json()
  },

  async getGenres() {
    const response = await fetch(`${API_BASE_URL}/genres`)
    if (!response.ok) throw new Error('Failed to fetch genres')
    return response.json()
  },

  async getTrack(mood: string, genre: string) {
    const response = await fetch(`${API_BASE_URL}/tracks?mood=${mood}&genre=${genre}`)
    if (!response.ok) throw new Error('Failed to fetch track')
    return response.json()
  }
}
