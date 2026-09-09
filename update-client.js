(()=>{
  if(!('serviceWorker' in navigator)) return;
  let checking=false;
  async function checkForUpdate(){
    if(checking) return;
    checking=true;
    try{
      const reg=await navigator.serviceWorker.getRegistration('/');
      if(reg) await reg.update();
    }catch(e){}finally{checking=false;}
  }
  window.addEventListener('focus',checkForUpdate);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdate();});
  setTimeout(checkForUpdate,1500);
  setInterval(checkForUpdate,15000);
})();
