// Public Firebase WEB configuration. Never put an Admin SDK private key here.
export const firebaseConfig=Object.freeze({
 apiKey:'AIzaSyCRf1CNwB6BANTSikyQp3mL21lwW0ZG_yM',
 authDomain:'kakaobot-6fea2.firebaseapp.com',
 projectId:'kakaobot-6fea2',
 storageBucket:'kakaobot-6fea2.firebasestorage.app',
 messagingSenderId:'1001642682494',
 appId:'1:1001642682494:web:26b5d7a3ed2857a09a902f',
 measurementId:'G-T49KXGFXGF'
});
// An independent module: SDK/analytics failures must never block the walk engine.
export const firebaseReady=(async()=>{
 try{
  const {initializeApp}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js');
  const app=initializeApp(firebaseConfig);
  document.documentElement.dataset.firebase='initialized';
  try{
   const {getAnalytics,isSupported}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js');
   if(await isSupported()){
    getAnalytics(app);document.documentElement.dataset.analytics='initialized';
   }else document.documentElement.dataset.analytics='unsupported';
  }catch{document.documentElement.dataset.analytics='unavailable';}
  return app;
 }catch{
  document.documentElement.dataset.firebase='unavailable';return null;
 }
})();
