import { hasKey, textModels, visionModels } from './_ai.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ai: hasKey(), model: textModels()[0], visionModel: visionModels()[0] });
}
