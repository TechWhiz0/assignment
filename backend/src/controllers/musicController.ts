
import { Request, Response } from 'express';
import { mockTracks, moods, genres } from '../data/mockTracks';

export const getMoods = (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: moods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moods'
    });
  }
};

export const getGenres = (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch genres'
    });
  }
};

export const getTrack = (req: Request, res: Response) => {
  try {
    const { mood, genre } = req.query;
    
    if (!mood || !genre) {
      return res.status(400).json({
        success: false,
        error: 'Mood and genre parameters are required'
      });
    }

    const filteredTracks = mockTracks.filter(
      track => track.mood === mood && track.genre === genre
    );
    
    if (filteredTracks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tracks found for this mood and genre combination'
      });
    }
    
    const randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
    
    res.json({
      success: true,
      data: randomTrack
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch track'
    });
  }
};

export const getAllTracks = (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: mockTracks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracks'
    });
  }
};
