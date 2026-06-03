// Public loader ensuring the full bundle is loaded, avoiding stale short copies.
(function ensureFullGameBundle(){
  function inject(src){
    var s=document.createElement('script');
    s.src=src+(src.indexOf('?')>-1?'&':'?')+'v=20260604-0126';
    s.async=false;
    document.head.appendChild(s);
  }
  // Try frontbundle API route first (serves from repo root or GitHub)
  inject('/frontbundle/game_new.js');
})();
