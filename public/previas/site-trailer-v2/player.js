const video = document.querySelector('video[data-video-src]');
const status = document.querySelector('#video-status');

async function prepareVideo() {
  video.controls = false;
  try {
    const response = await fetch(video.dataset.videoSrc, {credentials: 'omit'});
    if (!response.ok) throw new Error('Video unavailable');
    // This asset host returns complete files for Range requests. A local Blob
    // gives the native player accurate seeking without another server request.
    const file = await response.blob();
    const ready = new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, {once: true});
      video.addEventListener('error', reject, {once: true});
    });
    video.src = URL.createObjectURL(file);
    video.load();
    await ready;
    video.controls = true;
    status.textContent = 'Use os controles para assistir.';
  } catch {
    status.textContent = 'Use o botão abaixo para baixar o vídeo.';
  }
}

prepareVideo();
