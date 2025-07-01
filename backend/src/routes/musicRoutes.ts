
import express from 'express';
import { getMoods, getGenres, getTrack, getAllTracks } from '../controllers/musicController';

const router = express.Router();

router.get('/moods', getMoods);
router.get('/genres', getGenres);
router.get('/tracks', getTrack);
router.get('/tracks/all', getAllTracks);

export default router;
