import { hasKey, TEXT_MODEL, VISION_MODEL } from './_ai.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ai: hasKey(), model: TEXT_MODEL, visionModel: VISION_MODEL });
}
