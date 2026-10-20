export const MAX_SECONDS=90*60;
export const MAX_ITEMS=900;
export const MAX_BYTES=1024*1024*1024;
export const DOWNLOAD_TIMEOUT_MS=20*60*1000;
export function validateDuration(seconds){if(!Number.isFinite(seconds)||seconds<=0||seconds>MAX_SECONDS)throw Error('目前支持90分钟以内的视频。');return seconds;}
