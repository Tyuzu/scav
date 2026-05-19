import { createMediaApi, uploadFile as _uploadFile, postMedia as _postMedia } from "../../media/api/mediaApi.js";

// Create fanmade-specific API
const fanmadeApi = createMediaApi("fanmade");

export const fetchMedia = fanmadeApi.fetchMedia.bind(fanmadeApi);
export const deleteMedia = fanmadeApi.deleteMedia.bind(fanmadeApi);
export const postMedia = fanmadeApi.postMedia.bind(fanmadeApi);

// Re-export upload functions
export { uploadFile } from "../../media/api/mediaApi.js";
  