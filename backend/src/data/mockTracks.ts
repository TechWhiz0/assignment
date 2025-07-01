
export interface Track {
  id: string;
  title: string;
  url: string;
  mood: string;
  genre: string;
  duration?: string;
}

export const mockTracks: Track[] = [
  // Happy Pop
  {
    id: "1",
    title: "Sunny Day Vibes",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Happy",
    genre: "Pop",
    duration: "2:30"
  },
  {
    id: "2",
    title: "Feel Good Anthem",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Happy",
    genre: "Pop",
    duration: "3:15"
  },
  
  // Happy Lo-fi
  {
    id: "3",
    title: "Morning Coffee",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Happy",
    genre: "Lo-fi",
    duration: "2:45"
  },
  {
    id: "4",
    title: "Peaceful Moments",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Happy",
    genre: "Lo-fi",
    duration: "3:00"
  },

  // Sad Cinematic
  {
    id: "5",
    title: "Melancholy Dreams",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Sad",
    genre: "Cinematic",
    duration: "4:20"
  },
  {
    id: "6",
    title: "Rain on Glass",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Sad",
    genre: "Cinematic",
    duration: "3:45"
  },

  // Energetic EDM
  {
    id: "7",
    title: "Electric Pulse",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Energetic",
    genre: "EDM",
    duration: "3:30"
  },
  {
    id: "8",
    title: "Bass Drop Madness",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Energetic",
    genre: "EDM",
    duration: "4:00"
  },

  // Chill Lo-fi
  {
    id: "9",
    title: "Midnight Study Session",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Chill",
    genre: "Lo-fi",
    duration: "3:20"
  },
  {
    id: "10",
    title: "Ocean Breeze",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    mood: "Chill",
    genre: "Lo-fi",
    duration: "2:55"
  }
];

export const moods = ["Happy", "Sad", "Energetic", "Chill"];
export const genres = ["Pop", "Lo-fi", "Cinematic", "EDM"];
