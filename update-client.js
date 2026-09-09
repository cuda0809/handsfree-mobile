(()=>{
  let checking=false;
  const KEY='handsfree-app-version';

  async function fetchVersion(){
    const res=await fetch('/app-version.json?t='+Date.now(),{cache:'no-store'});
    if(!res.ok) throw new Error('version fetch failed');
    const data=await res.json();
    return String(data.version||'').trim();
  }

  async function checkForUpdate(){
    if(checking) return;
    checking=true;
    try{
      const latest=await fetchVersion();
      if(!latest) return;
      const current=localStorage.getItem(KEY);
      if(!current){
        localStorage.setItem(KEY,latest);
      }else if(current!==latest){
        localStorage.setItem(KEY,latest);
        location.replace('/?appv='+encodeURIComponent(latest));
        return;
      }
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration('/');
        if(reg) await reg.update();
      }
    }catch(e){}finally{checking=false;}
  }

  window.addEventListener('focus',checkForUpdate);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') checkForUpdate();
  });
  setTimeout(checkForUpdate,1000);
  setInterval(checkForUpdate,15000);
})();
