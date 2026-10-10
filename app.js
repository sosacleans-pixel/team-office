(function(){
'use strict';
var STATUSES={working:'Working',idle:'Idle',blocked:'Blocked',waiting_on_salim:'Waiting on Salim'};
var COLORS={working:'#1f9d55',idle:'#8a94a6',blocked:'#d64545',waiting_on_salim:'#e3a008'};
var LISTS=[['done','Done','#1f9d55'],['inProgress','In progress','#4c8dff'],['blocked','Blocked','#d64545'],['needsSalimItems','Needs Salim','#e3a008']];
var data=null,fStatus='all',fDept='all',lastFocus=null,lastLoaded=null;
var $=function(id){return document.getElementById(id);};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function str(v,d){return (typeof v==='string'&&v.trim())?v.trim():d;}
function arr(v){return Array.isArray(v)?v.filter(function(x){return typeof x==='string'&&x.trim();}):[];}
function initials(n){return n.split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();}
function fallbackAvatar(name,color){var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="'+color+'"/><text x="48" y="60" font-family="Arial" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">'+initials(name).replace(/[<&>"]/g,'')+'</text></svg>';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);}
function normalize(raw){
  var warn=[];
  if(!raw||typeof raw!=='object')throw new Error('status.json is not a JSON object');
  var depts=Array.isArray(raw.departments)?raw.departments:[];
  var dmap={};
  depts=depts.filter(function(d){return d&&d.id;}).map(function(d){var o={id:String(d.id),name:str(d.name,String(d.id)),color:/^#[0-9a-f]{3,8}$/i.test(d.color||'')?d.color:'#7a8699'};dmap[o.id]=o;return o;});
  var bots=(Array.isArray(raw.bots)?raw.bots:[]).filter(function(b){return b&&typeof b==='object';}).map(function(b,i){
    var name=str(b.name,'Unnamed bot '+(i+1));
    var dep=str(b.department,'other');
    if(!dmap[dep]){warn.push(name+': unknown department "'+dep+'"');dmap[dep]={id:dep,name:dep==='other'?'Other':dep,color:'#7a8699'};depts.push(dmap[dep]);}
    var st=STATUSES[b.status]?b.status:'idle';
    if(b.status&&!STATUSES[b.status])warn.push(name+': unknown status "'+b.status+'"');
    var o={id:str(b.id,'bot-'+i),name:name,role:str(b.role,'Team member'),department:dep,status:st,
      currentTask:str(b.currentTask,'No current task listed'),done:arr(b.done),inProgress:arr(b.inProgress),blocked:arr(b.blocked),needsSalimItems:arr(b.needsSalimItems),alsoIn:arr(b.alsoIn)};
    o.needsSalim=b.needsSalim===true||o.needsSalimItems.length>0;
    o.fallback=fallbackAvatar(name,dmap[dep].color);
    o.avatar=(typeof b.avatar==='string'&&/^[\w./-]+$/.test(b.avatar)&&b.avatar.indexOf('..')<0)?b.avatar:o.fallback;
    return o;});
  if(warn.length&&window.console)console.warn('status.json warnings:',warn);
  var t=Date.parse(raw.lastUpdated);
  return {lastUpdated:isNaN(t)?null:new Date(t),updatedBy:str(raw.updatedBy,'Alfred'),departments:depts,dmap:dmap,bots:bots};
}
function rel(d){var s=Math.round((Date.now()-d.getTime())/1000),a=Math.abs(s),r=new Intl.RelativeTimeFormat('en',{numeric:'auto'});
  var u=[[60,'second',1],[3600,'minute',60],[86400,'hour',3600],[2592000,'day',86400],[1e12,'month',2592000]];
  for(var i=0;i<u.length;i++)if(a<u[i][0])return r.format(-Math.round(s/u[i][2]),u[i][1]);}
function renderUpdated(){var p=$('updated');if(!data.lastUpdated){p.textContent='Last updated: unknown · by '+data.updatedBy;return;}
  var t=data.lastUpdated.toLocaleString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  p.textContent='Last updated '+rel(data.lastUpdated)+' ('+t+' MT) · by '+data.updatedBy;}
function renderSummary(){var s=$('summary');s.textContent='';var c={};Object.keys(STATUSES).forEach(function(k){c[k]=0;});var need=0;
  data.bots.forEach(function(b){c[b.status]++;if(b.needsSalim)need++;});
  Object.keys(STATUSES).forEach(function(k){var x=el('div','sum');var d=el('span','dot');d.style.background=COLORS[k];x.append(d,el('b',null,c[k]),document.createTextNode(STATUSES[k]));s.append(x);});
  var n=el('div','sum');n.append(el('b',null,need),document.createTextNode('Need Salim'));n.style.background='rgba(227,160,8,.3)';s.append(n);
  var t=el('div','sum');t.append(el('b',null,data.bots.length),document.createTextNode('Bots'));s.append(t);}
function chips(box,items,cur,set){box.textContent='';items.forEach(function(it){var b=el('button','chip',it[1]);b.type='button';b.setAttribute('aria-pressed',String(it[0]===cur));
  b.addEventListener('click',function(){set(it[0]);renderChips();applyFilters();});box.append(b);});}
function renderChips(){
  chips($('statusChips'),[['all','All statuses']].concat(Object.keys(STATUSES).map(function(k){return [k,STATUSES[k]];})).concat([['needs','Needs Salim']]),fStatus,function(v){fStatus=v;});
  chips($('deptChips'),[['all','All departments']].concat(data.departments.map(function(d){return [d.id,d.name];})),fDept,function(v){fDept=v;});}
function applyFilters(){document.querySelectorAll('.desk').forEach(function(d){var b=data.bots[+d.dataset.i];
  var ok=(fStatus==='all'||(fStatus==='needs'?b.needsSalim:b.status===fStatus))&&(fDept==='all'||b.department===fDept||b.alsoIn.indexOf(fDept)>=0);
  d.classList.toggle('dim',!ok);});}
function img(src,fb,alt){var i=el('img');i.src=src;i.alt=alt;i.loading='lazy';i.width=44;i.height=44;i.addEventListener('error',function(){if(i.src!==fb)i.src=fb;});return i;}
function desk(b,i){var color=data.dmap[b.department].color;var d=el('button','desk '+b.status);d.type='button';d.dataset.i=i;d.style.setProperty('--c',color);
  d.setAttribute('aria-label',b.name+', '+STATUSES[b.status]+(b.needsSalim?', needs Salim':'')+'. Open details.');
  var row=el('div','drow');var m=el('div','monitor');m.append(img(b.avatar,b.fallback,''));var t=el('div');t.append(el('div','dname',b.name),el('div','drole',b.role));row.append(m,t);
  var task=el('div','dtask',b.currentTask);task.title=b.currentTask;
  var p=el('div','pills');p.append(el('span','pill s-'+b.status,STATUSES[b.status]));if(b.needsSalim)p.append(el('span','pill need','Needs Salim'));
  if(b.status==='working'){var ty=el('span','typing');ty.setAttribute('aria-hidden','true');ty.append(el('i'),el('i'),el('i'));p.append(ty);}
  d.append(row,task,p);d.addEventListener('click',function(){openPanel(b,d);});return d;}
function renderFloor(){var f=$('floor');f.textContent='';
  data.departments.forEach(function(dep){var r=el('section','room '+dep.id);r.style.gridArea=/^[a-z][a-z0-9_-]*$/i.test(dep.id)?dep.id:'auto';
    r.style.setProperty('--c',dep.color);r.style.setProperty('--floor',dep.color+'26');r.setAttribute('aria-label',dep.name+' department');
    var h=el('h2',null,dep.name);var pl=el('span','plant',dep.id==='alfred'?'⭐':'🪴');pl.setAttribute('aria-hidden','true');r.append(h,pl);
    var ds=el('div','desks');data.bots.forEach(function(b,i){if(b.department===dep.id)ds.append(desk(b,i));});r.append(ds);
    var also=data.bots.filter(function(b){return b.alsoIn.indexOf(dep.id)>=0;});
    if(also.length)r.append(el('p','also','Also on this team: '+also.map(function(b){return b.name+' (desk in '+data.dmap[b.department].name+')';}).join(', ')));
    if(!ds.children.length&&!also.length)ds.append(el('p','empty','No desks yet'));
    f.append(r);});
  applyFilters();}
function openPanel(b,from){lastFocus=from;var color=data.dmap[b.department].color;var pa=$('pAvatar');pa.onerror=function(){if(pa.src!==b.fallback)pa.src=b.fallback;};pa.src=b.avatar;
  $('pTitle').textContent=b.name;$('pRole').textContent=b.role+' · '+data.dmap[b.department].name;
  var m=$('pMeta');m.textContent='';m.append(el('span','pill s-'+b.status,STATUSES[b.status]));if(b.needsSalim){m.append(document.createTextNode(' '));m.append(el('span','pill need','Needs Salim'));}
  $('pTask').textContent='Current: '+b.currentTask;
  var L=$('pLists');L.textContent='';LISTS.forEach(function(l){var h=el('h3');var d=el('span','dot');d.style.background=l[2];h.append(d,document.createTextNode(l[1]+' ('+b[l[0]].length+')'));L.append(h);
    if(!b[l[0]].length)L.append(el('p','empty','Nothing here'));else{var u=el('ul');b[l[0]].forEach(function(x){u.append(el('li',null,x));});L.append(u);}});
  $('panel').hidden=false;$('scrim').hidden=false;$('pClose').focus();}
function closePanel(){if($('panel').hidden)return;$('panel').hidden=true;$('scrim').hidden=true;if(lastFocus)lastFocus.focus();}
$('pClose').addEventListener('click',closePanel);$('scrim').addEventListener('click',closePanel);
document.addEventListener('keydown',function(e){if($('panel').hidden)return;
  if(e.key==='Escape'){e.preventDefault();closePanel();}
  else if(e.key==='Tab'){var f=$('panel').querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])');var a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
    else if(!$('panel').contains(document.activeElement)){e.preventDefault();a.focus();}}});
function load(){fetch('status.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(raw){var n=normalize(raw);var key=JSON.stringify(raw);if(key===lastLoaded)return;lastLoaded=key;data=n;$('error').hidden=true;renderUpdated();renderSummary();renderChips();renderFloor();})
  .catch(function(e){var x=$('error');x.hidden=false;x.textContent='Could not load the latest status ('+e.message+'). '+(data?'Showing the last loaded data.':'Please refresh in a moment.');if(!data)$('updated').textContent='Status unavailable';});}
load();setInterval(load,60000);setInterval(function(){if(data)renderUpdated();},30000);
})();
