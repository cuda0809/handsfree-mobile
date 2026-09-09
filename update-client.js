(()=>{
  let checking=false;
  const KEY='handsfree-deployment-version';

  async function fetchVersion(){
    const res=await fetch('/api/version?t='+Date.now(),{cache:'no-store'});
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
        location.replace('/?build='+encodeURIComponent(latest));
        return;
      }
    }catch(e){}finally{checking=false;}
  }

  setTimeout(checkForUpdate,1200);
  setInterval(checkForUpdate,15000);
})();
