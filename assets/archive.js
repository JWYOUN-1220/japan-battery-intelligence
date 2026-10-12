(function () {
  'use strict';
  const API='https://api.github.com/repos/JWYOUN-1220/japan-battery-intelligence/contents/reports';
  const PREFIX='japan-news-archive-v1:', PAGE_SIZE=12;
  const $=id=>document.getElementById(id);
  let reports=[], page=1, done=0, failed=0;
  const cache={get(key){try{return JSON.parse(localStorage.getItem(PREFIX+key));}catch{return null;}},set(key,value){try{localStorage.setItem(PREFIX+key,JSON.stringify(value));}catch{/* Storage quota/private browsing: keep working in memory. */}}};
  function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
  function reportLink(r){const a=node('a',r.date);a.href='reports/'+encodeURIComponent(r.name);return a;}
  function badge(text){return node('span',text,'archive-tag '+text.toLowerCase());}
  function selected(){
    const terms=ArchiveParser.normalize($('reportSearch').value).toLowerCase().split(' ').filter(Boolean);
    const month=$('reportMonth').value,category=$('categoryFilter').value,priority=$('priorityFilter').value;
    return reports.filter(r=>r.date.startsWith(month)&&(!category||r.categories.includes(category))&&(!priority||r.priorities.includes(priority))&&terms.every(term=>(r.date+' '+r.title+' '+r.text).toLowerCase().includes(term)))
      .sort((a,b)=>$('sortOrder').value==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name));
  }
  function render(){
    const filtered=selected(),pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,pages);
    $('resultCount').textContent=`검색 결과 ${filtered.length}건 / 전체 ${reports.length}건`;
    const list=$('report-list');list.replaceChildren();
    for(const r of filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)){
      const li=node('li'),top=node('div','','report-top');top.append(reportLink(r));
      r.priorities.forEach(p=>top.append(badge(p)));li.append(top);
      li.append(node('p',r.ready?r.title:'보고서 본문 확인 중…','report-title'));
      const tags=node('div','','report-tags');r.categories.forEach(c=>tags.append(badge(c)));li.append(tags);list.append(li);
    }
    if(!filtered.length)list.append(node('li',done<reports.length?'본문을 확인하는 중입니다. 잠시 후 검색 결과가 추가될 수 있습니다.':'검색 결과가 없습니다. 다른 키워드나 필터를 선택하세요.'));
    $('pageInfo').textContent=`${page} / ${pages}`;$('prev').disabled=page<=1;$('next').disabled=page>=pages;
  }
  function overview(){
    $('reportCount').textContent=reports.length;
    $('latestDate').textContent=reports[0]?.date||'없음';
    $('dateRange').textContent=reports.length?`${reports.at(-1).date} ~ ${reports[0].date}`:'—';
    $('latest-report-list').replaceChildren();
    for(const r of reports.slice(0,3)){const li=node('li');li.append(reportLink(r));li.append(node('p',r.ready?r.title:'일본 신사업 뉴스 브리핑'));$('latest-report-list').append(li);}
    if(!reports.length)$('latest-report-list').append(node('li','등록된 보고서가 없습니다.'));
  }
  function status(){
    $('indexStatus').textContent=done<reports.length?`본문 검색 준비 ${done} / ${reports.length}`:failed?`본문 ${failed}건을 읽지 못했습니다. 보고서 링크는 이용할 수 있습니다.`:'전체 보고서 본문 검색 가능';
  }
  async function load(){
    let files;const saved=cache.get('listing');
    try{
      const response=await fetch(API,{headers:{Accept:'application/vnd.github+json'}});
      if(!response.ok)throw Error(`GitHub ${response.status}`);files=await response.json();if(!Array.isArray(files))throw Error('목록 오류');
      files=files.filter(f=>f.type==='file'&&/^\d{4}-\d{2}-\d{2}\.html?$/i.test(f.name));cache.set('listing',{files,time:Date.now()});
    }catch(error){
      if(saved?.files){files=saved.files;$('loadError').hidden=false;$('loadError').textContent='새 보고서 목록을 확인하지 못해 이전 목록을 표시합니다. 잠시 후 페이지를 새로고침하세요.';}
      else{$('loadError').hidden=false;$('loadError').textContent='보고서 목록을 불러오지 못했습니다. 잠시 후 새로고침하거나 GitHub의 reports 폴더를 확인하세요.';$('latest-report-list').replaceChildren(node('li','목록을 불러오지 못했습니다.'));return;}
    }
    reports=files.sort((a,b)=>b.name.localeCompare(a.name)).map(f=>{const stored=cache.get(f.name);return stored?.sha===f.sha?{...stored.report,sha:f.sha,ready:true}:{name:f.name,date:f.name.replace(/\.html?$/i,''),title:'',text:'',categories:[],priorities:[],sha:f.sha,ready:false};});
    // Drop obsolete cached reports to bound local storage.
    try{const keep=new Set(reports.map(r=>PREFIX+r.name));Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)&&k!==PREFIX+'listing'&&!keep.has(k)).forEach(k=>localStorage.removeItem(k));}catch{}
    overview();render();status();let cursor=0;
    async function worker(){
      while(cursor<reports.length){const r=reports[cursor++];
        if(!r.ready){try{const response=await fetch('reports/'+encodeURIComponent(r.name)+'?v='+encodeURIComponent(r.sha));if(!response.ok)throw Error('HTTP '+response.status);Object.assign(r,ArchiveParser.parseReport(await response.text(),r.name),{ready:true});cache.set(r.name,{sha:r.sha,report:{name:r.name,date:r.date,title:r.title,text:r.text,categories:r.categories,priorities:r.priorities}});}catch{failed++;r.title='본문을 읽지 못했습니다. 보고서 링크에서 확인하세요.';}}
        done++;if(done%6===0||done===reports.length){overview();render();status();}
      }
    }
    await Promise.all(Array.from({length:Math.min(6,reports.length)},worker));status();
  }
  $('filters').addEventListener('submit',e=>e.preventDefault());
  $('filters').addEventListener('input',()=>{page=1;render();});
  $('filters').addEventListener('change',()=>{page=1;render();});
  $('filters').addEventListener('reset',()=>{setTimeout(()=>{page=1;render();},0);});
  $('prev').onclick=()=>{if(page>1){page--;render();}};
  $('next').onclick=()=>{page++;render();};
  load();
})();
