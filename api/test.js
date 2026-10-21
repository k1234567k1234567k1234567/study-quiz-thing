import { selfTest } from './_ai.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(await selfTest());
}
