// Local hls.js distribution. No remote CDN or analytics calls at runtime.
export function attachMedia(video,src,onError){
 let hls;
 function load(){
  if(hls){hls.destroy();hls=null;}
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=src;video.load();return;}
  if(window.Hls?.isSupported()){
   hls=new window.Hls({maxBufferLength:16,maxMaxBufferLength:32,backBufferLength:12});
   hls.on(window.Hls.Events.ERROR,(_event,data)=>{if(data.fatal)onError('영상을 연결하지 못했습니다. 영상 다시 불러오기를 눌러주세요.');});
   hls.loadSource(src);hls.attachMedia(video);
  }else queueMicrotask(()=>onError('이 브라우저에서 영상을 재생할 수 없습니다. 최신 Safari, Chrome, Edge에서 열어주세요.'));
 }
 load();return{reload:load};
}
