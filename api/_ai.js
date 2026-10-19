// Shared by the Vercel functions. The key comes from the NVIDIA_API_KEY environment variable.
export const BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
export const TEXT_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
export const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct';
export const hasKey = () => Boolean(process.env.NVIDIA_API_KEY && !/^nvapi-x+$/i.test(process.env.NVIDIA_API_KEY));
