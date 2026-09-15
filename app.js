(function(){
  "use strict";
  var LEVELS = [
    { id:1, tag:"Kata Dasar", name:"Pemula", desc:"Kata-kata pendek, huruf kecil semua. Pemanasan jari.", minWPM:15,
      texts:["kucing itu tidur di atas kasur empuk sepanjang siang","ibu memasak nasi goreng untuk sarapan pagi ini","adik bermain bola di halaman rumah bersama teman","aku suka membaca buku cerita sebelum tidur malam","hujan turun deras sore ini membasahi jalan desa","kakek menyiram bunga di kebun setiap pagi hari"]},
    { id:2, tag:"Kalimat", name:"Menengah", desc:"Kalimat lengkap dengan huruf besar dan tanda baca.", minWPM:18,
      texts:["Pagi ini, Budi bangun lebih awal untuk berlari mengelilingi taman kota.","Setelah belajar tiga jam, Rina akhirnya memahami materi matematika dengan baik.","Ayah membeli buah-buahan segar di pasar tradisional dekat rumah kami.","Di sekolah, para siswa sedang berlatih menari untuk acara perpisahan kelas.","Nelayan itu pulang membawa banyak ikan segar hasil tangkapan semalam.","Setiap akhir pekan, keluarga kami pergi berkemah di kaki gunung."]}
  ];
  var WORD_POOL = ["rumah","makan","minum","cepat","lambat","kuat","lemah","besar","kecil","tinggi","rendah","kucing","anjing","burung","ikan","meja","kursi","pintu","jendela","lampu","buku","pensil","kertas","sekolah","kantor","pasar","jalan","kota","desa","gunung","laut","sungai","hutan","langit","bintang","bulan","matahari","hujan","angin","petir","api","air","tanah","udara","waktu","hari","malam","pagi","siang","sore","teman","keluarga","kerja","belajar","bermain","tidur","bangun","makanan","minuman","pakaian","sepatu","tas","mobil","motor","sepeda","kereta","pesawat","kapal","uang","harga","toko","warung","pantai","sawah","kebun","taman","provinsi","negara","dunia","bahasa","budaya","musik","tari","lagu","cerita","cinta","bahagia","sedih","marah","takut","berani","jujur","sabar","rajin","malas","pintar","bijak","kilat","gesit","tekun","fokus"];
  var STORAGE_KEY = "nomistake_progress_v2";
  function defaultProgress(){
    var levels = {};
    LEVELS.forEach(function(l){ levels[l.id] = { stars:0, bestWPM:0, bestAccuracy:0, timesPlayed:0 }; });
    return { unlockedLevel:1, levels:levels, totalSessions:0, totalCharsTyped:0, soundOn:true, wordRain:{ bestScore:0, bestWave:1 }, timeAttack:{ bestWPM:0, bestWords:0 }, zeroMode:{ bestStreak:0, bestClears:0 } };
  }
  var progress = defaultProgress();
  function loadProgress(){
    return (window.storage ? window.storage.get(STORAGE_KEY) : Promise.reject())
      .then(function(res){
        if(res && res.value){
          var parsed = JSON.parse(res.value);
          progress = Object.assign(defaultProgress(), parsed);
          LEVELS.forEach(function(l){ if(!progress.levels[l.id]) progress.levels[l.id] = { stars:0, bestWPM:0, bestAccuracy:0, timesPlayed:0 }; });
          if(!progress.wordRain) progress.wordRain = { bestScore:0, bestWave:1 };
          if(!progress.timeAttack) progress.timeAttack = { bestWPM:0, bestWords:0 };
          if(!progress.zeroMode) progress.zeroMode = { bestStreak:0, bestClears:0 };
        }
      }).catch(function(){}).finally(renderHub);
  }
  function saveProgress(){
    if(!window.storage) return;
    window.storage.set(STORAGE_KEY, JSON.stringify(progress), false).catch(function(){});
  }
  var audioCtx = null;
  function beep(freq, dur, type){
    if(!progress.soundOn) return;
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || "sine"; o.frequency.value = freq; g.gain.value = 0.05;
      o.connect(g); g.connect(audioCtx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    }catch(e){}
  }
  var app = document.getElementById("app");
  var game = null, rain = null, attack = null, zero = null;
  function escapeHtml(c){ return c.replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">").replace(/"/g,"""); }
  function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function randomWords(n){ var out=[]; for(var i=0;i<n;i++){ out.push(pickRandom(WORD_POOL)); } return out.join(" "); }
  function openOverlay(innerHtml){
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = '<div class="result-card">'+innerHtml+'</div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function iconStar(filled){ return '<svg width="22" height="22" viewBox="0 0 24 24" fill="'+(filled?'var(--accent)':'none')+'" stroke="'+(filled?'var(--accent)':'var(--border-strong)')+'" stroke-width="1.6"><path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" stroke-linejoin="round"/></svg>'; }
  function iconStarSmall(filled){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(filled?'var(--accent)':'none')+'" stroke="'+(filled?'var(--accent)':'var(--border-strong)')+'" stroke-width="1.8"><path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" stroke-linejoin="round"/></svg>'; }
  function iconLock(){ return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'; }
  function iconSound(on){ return on ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8a5 5 0 0 1 0 8"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>'; }
  function iconHeart(filled){ return '<svg width="19" height="19" viewBox="0 0 24 24" fill="'+(filled?'var(--error)':'none')+'" stroke="'+(filled?'var(--error)':'var(--border-strong)')+'" stroke-width="1.8"><path d="M12 21s-7-4.4-9.5-8.8C.7 8.7 2.1 5 5.6 5c2 0 3.3 1 4.4 2.5C11.1 6 12.4 5 14.4 5c3.5 0 4.9 3.7 3.1 7.2C19 16.6 12 21 12 21z"/></svg>'; }
  function iconDroplet(){ return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3s6 7 6 11.5A6 6 0 0 1 6 14.5C6 10 12 3 12 3z"/></svg>'; }
  function iconStopwatch(){ return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v2"/></svg>'; }
  function iconSkull(){ return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a7 7 0 0 0-7 7v3l1.5 3h2L9 14h6l.5 2h2l1.5-3v-3a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg>'; }
  function iconFlag(){ return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>'; }
  function kbdHeroSvg(){
    var keys = "", xs=[10,54,98,142,186,230,274,318];
    xs.forEach(function(x){ keys += '<rect class="key" x="'+x+'" y="10" width="34" height="34" rx="7"></rect>'; });
    return '<svg class="kbd-hero" width="356" height="150" viewBox="0 0 356 60">'+keys+'</svg>';
  }
  function topbarHtml(){
    return '<div class="topbar"><div class="brand">'+'<div class="brand-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h7l-1 8 11-13h-8l1-7z" fill="#1a0b2e"/></svg></div>'+'<div class="brand-name">No<span>Mistake</span></div></div>'+'<div class="topbar-actions"><button class="icon-btn'+(progress.soundOn?' active':'')+'" id="soundToggle" title="Suara">'+iconSound(progress.soundOn)+'</button></div></div>';
  }
  function bindTopbar(afterToggle){
    document.getElementById("soundToggle").onclick = function(){ progress.soundOn=!progress.soundOn; saveProgress(); afterToggle(); };
  }
  function overallBestWPM(){
    var best=0;
    LEVELS.forEach(function(l){ best = Math.max(best, progress.levels[l.id].bestWPM); });
    return Math.max(best, progress.timeAttack.bestWPM);
  }
  function totalStars(){ var t=0; LEVELS.forEach(function(l){ t+=progress.levels[l.id].stars; }); return t; }
  function renderHub(){
    game=null; rain=null; attack=null; zero=null;
    var modeCards =
      '<button class="mode-card" id="cardLevel"><div class="mode-icon">'+iconFlag()+'</div><h3>Mode Level</h3><p>10 level progresif dari kata dasar sampai kutipan tersulit. Kumpulkan bintang di tiap level.</p><div class="mode-stat">'+progress.unlockedLevel+'/'+LEVELS.length+' terbuka · <b>'+totalStars()+'</b>/'+(LEVELS.length*3)+' bintang</div><div class="mode-cta">Mulai</div></button>'+
      '<button class="mode-card" id="cardRain"><div class="mode-icon">'+iconDroplet()+'</div><h3>Hujan Kata</h3><p>Kata berjatuhan dari atas layar. Ketik sebelum menyentuh dasar, atau nyawamu berkurang.</p><div class="mode-stat">Skor tertinggi <b>'+progress.wordRain.bestScore+'</b> · Gelombang <b>'+progress.wordRain.bestWave+'</b></div><div class="mode-cta">Main</div></button>'+
      '<button class="mode-card" id="cardAttack"><div class="mode-icon">'+iconStopwatch()+'</div><h3>Waktu Kilat</h3><p>60 detik. Ketik kata sebanyak dan secepat mungkin sebelum waktu habis.</p><div class="mode-stat">WPM terbaik <b>'+progress.timeAttack.bestWPM+'</b></div><div class="mode-cta">Main</div></button>'+
      '<button class="mode-card" id="cardZero"><div class="mode-icon">'+iconSkull()+'</div><h3>Mode Zero</h3><p>Satu kesalahan, langsung game over — tanpa backspace. Seberapa jauh kamu bertahan?</p><div class="mode-stat">Jarak terjauh <b>'+progress.zeroMode.bestStreak+'</b> karakter · <b>'+progress.zeroMode.bestClears+'</b>x tuntas sempurna</div><div class="mode-cta">Main</div></button>';
    app.innerHTML = topbarHtml() +
      '<div class="hero">'+kbdHeroSvg()+'<p class="hero-eyebrow">4 mode arcade — Latihan mengetik Bahasa Indonesia</p><h1>Satu tujuan: ketik <span class="accent-word">tanpa</span> kesalahan.</h1><p>Naik level di kampanye klasik, kejar skor di hujan kata, uji kecepatan di waktu kilat, atau buktikan presisimu di mode zero yang tanpa ampun.</p><div class="hero-stats"><div class="hero-stat"><b>'+overallBestWPM()+'</b><span>WPM TERTINGGI</span></div><div class="hero-stat"><b>'+totalStars()+'/'+(LEVELS.length*3)+'</b><span>BINTANG</span></div><div class="hero-stat"><b>'+progress.totalSessions+'</b><span>SESI TOTAL</span></div></div></div>'+
      '<div class="section-head"><h2>Pilih mode</h2><p>Progres tiap mode tersimpan otomatis</p></div><div class="mode-grid">'+modeCards+'</div>'+
      '<footer>Progres tersimpan otomatis di perangkat ini. <button id="resetBtn">Reset semua progres</button></footer>';
    bindTopbar(renderHub);
    document.getElementById("cardLevel").onclick = renderLevelSelect;
    document.getElementById("cardRain").onclick = startWordRain;
    document.getElementById("cardAttack").onclick = startTimeAttack;
    document.getElementById("cardZero").onclick = startZeroMode;
    document.getElementById("resetBtn").onclick = function(){
      if(confirm("Hapus semua progres di semua mode dan mulai dari awal?")){ progress = defaultProgress(); saveProgress(); renderHub(); }
    };
  }
  function renderLevelSelect(){
    var cardsHtml = LEVELS.map(function(l){
      var lv = progress.levels[l.id];
      var unlocked = l.id <= progress.unlockedLevel;
      var meterPct = Math.round(l.id / LEVELS.length * 100);
      var stars = ""; for(var s=1;s<=3;s++){ stars += iconStarSmall(s<=lv.stars); }
      return '<button class="level-card '+(unlocked?'unlocked':'locked')+'" data-level="'+l.id+'" '+(unlocked?'':'disabled')+'>'+'<div class="level-card-top"><div class="level-num">'+(unlocked ? String(l.id).padStart(2,'0') : iconLock())+'</div><div class="level-tag">'+l.tag+'</div></div>'+'<h3>'+l.name+'</h3><p class="desc">'+(unlocked ? l.desc : 'Selesaikan level sebelumnya untuk membuka.')+'</p>'+'<div class="level-meter"><i style="width:'+meterPct+'%"></i></div>'+'<div class="level-card-foot"><div class="stars-row">'+stars+'</div><div class="stat-mini">'+(lv.timesPlayed ? '<b>'+lv.bestWPM+'</b> WPM' : '—')+'</div></div></button>';
    }).join("");
    app.innerHTML = topbarHtml() + '<button class="back-link" id="backHub" style="margin-top:18px;">Kembali ke Beranda</button><div class="section-head"><h2>Mode Level</h2><p>'+progress.unlockedLevel+' dari '+LEVELS.length+' terbuka</p></div><div class="level-grid">'+cardsHtml+'</div>';
    bindTopbar(renderLevelSelect);
    document.getElementById("backHub").onclick = renderHub;
    document.querySelectorAll(".level-card.unlocked").forEach(function(btn){
      btn.onclick = function(){ startLevel(parseInt(btn.getAttribute("data-level"),10)); };
    });
  }
  function startLevel(levelId){
    var level = LEVELS.filter(function(l){ return l.id===levelId; })[0];
    var text = level.texts[Math.floor(Math.random()*level.texts.length)];
    game = { level:level, text:text, typed:"", startTime:null, timerId:null, finished:false, wpm:0, accuracy:100 };
    app.innerHTML = topbarHtml() + '<div class="game-wrap"><div class="game-topbar"><button class="back-link" id="backBtn">Level '+game.level.id+' · '+game.level.name+'</button><div class="live-stats"><div class="live-stat"><b id="statWpm">0</b><span>WPM</span></div><div class="live-stat"><b id="statAcc">100%</b><span>AKURASI</span></div><div class="live-stat"><b id="statTime">0:00</b><span>WAKTU</span></div></div></div><div class="progress-track"><div class="progress-fill" id="progFill"></div></div><div class="type-card" id="typeCard"><div class="type-text" id="typeText">'+text.split("").map(function(c,i){ return '<span class="ch pending" data-i="'+i+'">'+escapeHtml(c)+'</span>'; }).join("")+'</div><input class="hidden-input" id="hiddenInput" type="text" autocomplete="off" spellcheck="false" maxlength="'+game.text.length+'"></div><p class="type-hint">Ketuk teks lalu mulai mengetik. Target: <b>'+game.level.minWPM+' WPM</b>.</p><button class="cancel-btn" id="cancelBtn">Batalkan</button></div>';
    bindTopbar(function(){ startLevel(levelId); });
    var input = document.getElementById("hiddenInput");
    document.getElementById("typeCard").onclick = function(){ input.focus(); };
    document.getElementById("backBtn").onclick = document.getElementById("cancelBtn").onclick = function(){ if(game&&game.timerId) clearInterval(game.timerId); renderLevelSelect(); };
    input.addEventListener("paste", function(e){ e.preventDefault(); });
    input.addEventListener("input", function(e){
      game.typed = e.target.value;
      if(game.startTime===null && game.typed.length>0){ game.startTime = Date.now(); game.timerId = setInterval(function(){
        var correct=0; for(var i=0;i<game.typed.length;i++){ if(game.typed[i]===game.text[i]) correct++; }
        var accuracy = game.typed.length ? Math.round(correct/game.typed.length*100) : 100;
        var elapsedMin = (Date.now()-game.startTime)/60000;
        var wpm = elapsedMin>0 ? Math.round((correct/5)/elapsedMin) : 0;
        game.wpm=wpm; game.accuracy=accuracy;
        var secs=Math.floor((Date.now()-game.startTime)/1000);
        var el; if(el=document.getElementById("statWpm")){ el.textContent=wpm; document.getElementById("statAcc").textContent=accuracy+"%"; document.getElementById("statTime").textContent=Math.floor(secs/60)+":"+(secs%60<10?"0":"")+(secs%60); }
      }, 250); }
      var target = game.text;
      document.querySelectorAll("#typeText .ch").forEach(function(span, i){
        span.className = "ch " + (i < game.typed.length ? (game.typed[i]===target[i] ? "correct" : "incorrect") : i===game.typed.length ? "current" : "pending");
      });
      document.getElementById("progFill").style.width = Math.round(game.typed.length/target.length*100)+"%";
      if(game.typed.length >= target.length && !game.finished){
        game.finished=true; if(game.timerId) clearInterval(game.timerId);
        var correct=0,wrong=0; for(var i=0;i<game.typed.length;i++){ if(game.typed[i]===target[i]) correct++; else wrong++; }
        var accuracy = Math.round(correct/(correct+wrong)*100)||0, wpm=game.wpm, stars=1;
        if(accuracy>=90 && wpm>=level.minWPM) stars=2;
        if(accuracy>=97 && wpm>=Math.round(level.minWPM*1.3)) stars=3;
        var lv = progress.levels[level.id];
        lv.timesPlayed+=1; lv.bestWPM=Math.max(lv.bestWPM,wpm); lv.bestAccuracy=Math.max(lv.bestAccuracy,accuracy); lv.stars=Math.max(lv.stars,stars);
        progress.totalSessions+=1; if(level.id+1<=LEVELS.length) progress.unlockedLevel=Math.max(progress.unlockedLevel, level.id+1);
        saveProgress(); beep(880,0.18,"triangle");
        var overlay = openOverlay('<div class="result-stars">'+[1,2,3].map(function(s){return iconStar(s<=stars);}).join("")+'</div><p class="result-msg">'+(stars===3?"Sempurna!":stars===2?"Bagus sekali!":"Level selesai")+'</p><div class="result-grid"><div><b>'+wpm+'</b><span>WPM</span></div><div><b>'+accuracy+'%</b><span>AKURASI</span></div><div><b>'+level.name+'</b><span>LEVEL</span></div></div><div class="result-actions"><button class="btn-primary" id="retryBtn">Ulangi</button><button class="btn-secondary" id="menuBtn">Beranda</button></div>');
        document.getElementById("retryBtn").onclick=function(){ overlay.remove(); startLevel(level.id); };
        document.getElementById("menuBtn").onclick=function(){ overlay.remove(); renderHub(); };
      }
    });
    setTimeout(function(){ input.focus(); }, 50);
  }
  function startWordRain(){
    rain = { score:0, lives:3, wave:1, words:[], nextId:1, spawnAccum:0, spawnInterval:1900, nextWaveScore:120, destroyed:0, tickId:null, running:true };
    app.innerHTML = topbarHtml() + '<div class="game-wrap"><div class="game-topbar"><button class="back-link" id="backBtn">Hujan Kata</button><div class="live-stats"><div class="live-stat"><b id="rainScore">0</b><span>SKOR</span></div><div class="live-stat"><b id="rainWave">1</b><span>GELOMBANG</span></div><div class="live-stat"><div class="hearts-row" id="rainHearts"></div><span>NYAWA</span></div></div></div><div class="rain-field" id="rainField"></div><div class="rain-preview" id="rainPreview">&nbsp;</div><p class="type-hint">Ketik kata yang jatuh sebelum menyentuh garis merah.</p><input class="hidden-input" id="rainInput" type="text" autocomplete="off" spellcheck="false"><button class="cancel-btn" id="cancelBtn">Berhenti</button></div>';
    bindTopbar(function(){ startWordRain(); });
    function renderHearts(){ var el=document.getElementById("rainHearts"); if(!el)return; var h=""; for(var i=0;i<3;i++) h+=iconHeart(i<rain.lives); el.innerHTML=h; }
    renderHearts();
    var input=document.getElementById("rainInput");
    document.getElementById("rainField").onclick=function(){input.focus();};
    document.getElementById("backBtn").onclick=document.getElementById("cancelBtn").onclick=function(){ rain.running=false; if(rain.tickId)clearInterval(rain.tickId); renderHub(); };
    input.addEventListener("input", function(e){
      if(!rain||!rain.running)return;
      var typed=e.target.value.toLowerCase(), preview=document.getElementById("rainPreview"), words=rain.words, current=typed;
      var prefixMatches=words.filter(function(w){return current.length>0&&w.text.indexOf(current)===0;});
      if(current.length>0&&prefixMatches.length===0){ var fixed=current.slice(0,-1); e.target.value=fixed; words.forEach(function(w){w.el.classList.toggle("targeted",fixed.length>0&&w.text.indexOf(fixed)===0);}); if(preview){preview.textContent=fixed||"Karakter salah diabaikan";preview.classList.add("error");} beep(170,0.045,"square"); return; }
      words.forEach(function(w){w.el.classList.toggle("targeted",current.length>0&&w.text.indexOf(current)===0);});
      if(preview){preview.classList.remove("error");preview.textContent=current||"\u00a0";}
      var hit=words.filter(function(w){return w.text===current;})[0];
      if(hit){ hit.el.remove(); rain.words=rain.words.filter(function(w){return w.id!==hit.id;}); rain.score+=hit.text.length*10+rain.wave*2; rain.destroyed++; e.target.value=""; if(preview)preview.textContent="\u00a0"; beep(720,0.06,"sine"); document.getElementById("rainScore").textContent=rain.score; if(rain.score>=rain.nextWaveScore){ rain.wave++; rain.nextWaveScore+=120+rain.wave*20; rain.spawnInterval=Math.max(650,rain.spawnInterval-90); document.getElementById("rainWave").textContent=rain.wave; beep(1000,0.12,"triangle"); } }
    });
    setTimeout(function(){input.focus();},50);
    rain.tickId=setInterval(function(){
      if(!rain||!rain.running)return;
      var field=document.getElementById("rainField"); if(!field)return;
      var fh=field.clientHeight;
      for(var i=rain.words.length-1;i>=0;i--){ var w=rain.words[i]; w.y+=w.speed; w.el.style.top=w.y+"px"; if(w.y>fh-40){ w.el.remove(); rain.words.splice(i,1); rain.lives--; renderHearts(); beep(150,0.15,"sawtooth"); if(rain.lives<=0){ rain.running=false; if(rain.tickId)clearInterval(rain.tickId); progress.wordRain.bestScore=Math.max(progress.wordRain.bestScore,rain.score); progress.wordRain.bestWave=Math.max(progress.wordRain.bestWave,rain.wave); progress.totalSessions+=1; saveProgress(); var ov=openOverlay('<div class="result-icon">'+iconHeart(false)+'</div><p class="result-msg">Kehabisan nyawa</p><div class="result-grid"><div><b>'+rain.score+'</b><span>SKOR</span></div><div><b>'+rain.wave+'</b><span>GELOMBANG</span></div><div><b>'+rain.destroyed+'</b><span>KATA</span></div></div><div class="result-actions"><button class="btn-primary" id="retryBtn">Main Lagi</button><button class="btn-secondary" id="menuBtn">Beranda</button></div>'); document.getElementById("retryBtn").onclick=function(){ov.remove();startWordRain();}; document.getElementById("menuBtn").onclick=function(){ov.remove();renderHub();}; return; } } }
      rain.spawnAccum+=40;
      if(rain.spawnAccum>=rain.spawnInterval&&rain.words.length<6){ rain.spawnAccum=0; var text=pickRandom(WORD_POOL); var el=document.createElement("div"); el.className="rain-word"; el.textContent=text; el.style.left=(Math.random()*65+5)+"%"; el.style.top="-30px"; field.appendChild(el); rain.words.push({id:rain.nextId++,text:text,y:-30,speed:clamp(1.3+rain.wave*0.3,1.3,5),el:el}); }
    },40);
  }
  function startTimeAttack(){
    var text=randomWords(260);
    attack={text:text,typed:"",startTime:Date.now(),duration:60,timerId:null,finished:false,wpm:0,accuracy:100};
    app.innerHTML=topbarHtml()+'<div class="game-wrap"><div class="game-topbar"><button class="back-link" id="backBtn">Waktu Kilat</button><div class="live-stats"><div class="live-stat"><b id="statWpm">0</b><span>WPM</span></div><div class="live-stat"><b id="statAcc">100%</b><span>AKURASI</span></div><div class="live-stat"><b id="statWords">0</b><span>KATA</span></div></div></div><div class="timer-big" id="attackTimer">60</div><div class="type-card" id="typeCard"><div class="type-text" id="typeText">'+text.split("").map(function(c,i){return '<span class="ch pending">'+escapeHtml(c)+'</span>';}).join("")+'</div><input class="hidden-input" id="attackInput" type="text" autocomplete="off" spellcheck="false"></div><p class="type-hint">Ketik secepat mungkin!</p><button class="cancel-btn" id="cancelBtn">Berhenti</button></div>';
    bindTopbar(function(){startTimeAttack();});
    var input=document.getElementById("attackInput");
    document.getElementById("typeCard").onclick=function(){input.focus();};
    document.getElementById("backBtn").onclick=document.getElementById("cancelBtn").onclick=function(){if(attack&&attack.timerId)clearInterval(attack.timerId);renderHub();};
    input.addEventListener("input",function(e){if(!attack||attack.finished)return;attack.typed=e.target.value;document.querySelectorAll("#typeText .ch").forEach(function(span,i){span.className="ch "+(i<attack.typed.length?(attack.typed[i]===attack.text[i]?"correct":"incorrect"):i===attack.typed.length?"current":"pending");});});
    setTimeout(function(){input.focus();},50);
    attack.timerId=setInterval(function(){
      if(!attack||attack.finished)return;
      var remaining=Math.max(0,Math.ceil(attack.duration-(Date.now()-attack.startTime)/1000));
      var te=document.getElementById("attackTimer"); if(te){te.textContent=remaining;te.classList.toggle("warn",remaining<=10);}
      var correct=0; for(var i=0;i<attack.typed.length;i++) if(attack.typed[i]===attack.text[i]) correct++;
      var accuracy=attack.typed.length?Math.round(correct/attack.typed.length*100):100;
      var elapsedMin=(Date.now()-attack.startTime)/60000;
      var wpm=elapsedMin>0?Math.round((correct/5)/Math.min(elapsedMin,1)):0;
      attack.wpm=wpm; attack.accuracy=accuracy;
      var words=(attack.typed.match(/ /g)||[]).length;
      var el; if(el=document.getElementById("statWpm")){el.textContent=wpm;document.getElementById("statAcc").textContent=accuracy+"%";document.getElementById("statWords").textContent=words;}
      if(remaining<=0){ attack.finished=true; clearInterval(attack.timerId); if(input)input.disabled=true; progress.timeAttack.bestWPM=Math.max(progress.timeAttack.bestWPM,wpm); progress.timeAttack.bestWords=Math.max(progress.timeAttack.bestWords,words); progress.totalSessions+=1; saveProgress(); beep(880,0.2,"triangle"); var ov=openOverlay('<div class="result-icon">'+iconStopwatch()+'</div><p class="result-msg">Waktu habis!</p><div class="result-grid"><div><b>'+wpm+'</b><span>WPM</span></div><div><b>'+accuracy+'%</b><span>AKURASI</span></div><div><b>'+words+'</b><span>KATA</span></div></div><div class="result-actions"><button class="btn-primary" id="retryBtn">Main Lagi</button><button class="btn-secondary" id="menuBtn">Beranda</button></div>'); document.getElementById("retryBtn").onclick=function(){ov.remove();startTimeAttack();}; document.getElementById("menuBtn").onclick=function(){ov.remove();renderHub();}; }
    },200);
  }
  function startZeroMode(){
    var pool=LEVELS; var text=pickRandom(pickRandom(pool).texts)+" "+pickRandom(pickRandom(pool).texts);
    zero={text:text,typed:"",startTime:null,timerId:null,finished:false};
    app.innerHTML=topbarHtml()+'<div class="game-wrap"><div class="game-topbar"><button class="back-link" id="backBtn">Mode Zero</button><div class="live-stats"><div class="live-stat"><b id="statWpm">0</b><span>WPM</span></div><div class="live-stat"><b id="statStreak">0</b><span>KARAKTER</span></div></div></div><p class="zero-warn">'+iconHeart(true)+' Satu kesalahan = game over</p><div class="progress-track"><div class="progress-fill" id="progFill"></div></div><div class="type-card danger" id="typeCard"><div class="type-text" id="typeText">'+text.split("").map(function(c,i){return '<span class="ch pending">'+escapeHtml(c)+'</span>';}).join("")+'</div><input class="hidden-input" id="zeroInput" type="text" autocomplete="off" spellcheck="false"></div><p class="type-hint">Ketuk teks lalu mulai mengetik dengan hati-hati.</p><button class="cancel-btn" id="cancelBtn">Menyerah</button></div>';
    bindTopbar(function(){startZeroMode();});
    var input=document.getElementById("zeroInput");
    document.getElementById("typeCard").onclick=function(){input.focus();};
    document.getElementById("backBtn").onclick=document.getElementById("cancelBtn").onclick=function(){if(zero&&zero.timerId)clearInterval(zero.timerId);renderHub();};
    input.addEventListener("keydown",function(e){if(e.key==="Backspace"||e.key==="Delete")e.preventDefault();});
    input.addEventListener("input",function(e){
      if(!zero||zero.finished)return;
      var val=e.target.value; if(val.length<zero.typed.length)return; zero.typed=val;
      if(zero.startTime===null&&zero.typed.length>0){zero.startTime=Date.now();zero.timerId=setInterval(function(){var elapsedMin=(Date.now()-zero.startTime)/60000;var wpm=elapsedMin>0?Math.round((zero.typed.length/5)/elapsedMin):0;var el;if(el=document.getElementById("statWpm")){el.textContent=wpm;document.getElementById("statStreak").textContent=zero.typed.length;}},250);}
      var target=zero.text, idx=zero.typed.length-1, ok=zero.typed[idx]===target[idx];
      document.querySelectorAll("#typeText .ch").forEach(function(span,i){span.className="ch "+(i<zero.typed.length?(zero.typed[i]===target[i]?"correct":"incorrect"):i===zero.typed.length?"current":"pending");});
      document.getElementById("progFill").style.width=Math.round(zero.typed.length/target.length*100)+"%";
      if(!ok){beep(140,0.25,"sawtooth");zero.finished=true;if(zero.timerId)clearInterval(zero.timerId);if(input)input.disabled=true;var streak=zero.typed.length-1;progress.zeroMode.bestStreak=Math.max(progress.zeroMode.bestStreak,streak);progress.totalSessions+=1;saveProgress();var ov=openOverlay('<div class="result-icon">'+iconSkull()+'</div><p class="result-msg">Kena kesalahan pertama</p><p class="result-sub">Bertahan '+streak+' karakter.</p><div class="result-actions"><button class="btn-primary" id="retryBtn">Coba Lagi</button><button class="btn-secondary" id="menuBtn">Beranda</button></div>');document.getElementById("retryBtn").onclick=function(){ov.remove();startZeroMode();};document.getElementById("menuBtn").onclick=function(){ov.remove();renderHub();};return;}
      beep(680,0.04,"sine");
      if(zero.typed.length>=target.length){zero.finished=true;if(zero.timerId)clearInterval(zero.timerId);if(input)input.disabled=true;progress.zeroMode.bestStreak=Math.max(progress.zeroMode.bestStreak,target.length);progress.zeroMode.bestClears+=1;progress.totalSessions+=1;saveProgress();beep(880,0.25,"triangle");var ov=openOverlay('<div class="result-icon">'+iconStar(true)+'</div><p class="result-msg">Sempurna!</p><div class="result-actions"><button class="btn-primary" id="retryBtn">Coba Lagi</button><button class="btn-secondary" id="menuBtn">Beranda</button></div>');document.getElementById("retryBtn").onclick=function(){ov.remove();startZeroMode();};document.getElementById("menuBtn").onclick=function(){ov.remove();renderHub();};}
    });
    setTimeout(function(){input.focus();},50);
  }
  loadProgress();
})();
