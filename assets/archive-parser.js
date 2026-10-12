/* Parse data literals only. Report scripts are never executed. */
(function (root) {
  'use strict';
  function literal(source, start) {
    let i = start, count = 0;
    function space() {
      while (i < source.length) {
        if (/\s/.test(source[i])) { i++; continue; }
        if (source.slice(i,i+2) === '//') { i = source.indexOf('\n',i); if(i<0)i=source.length; continue; }
        if (source.slice(i,i+2) === '/*') { const end=source.indexOf('*/',i+2); if(end<0)throw Error('Comment'); i=end+2; continue; }
        break;
      }
    }
    function string() {
      const quote = source[i++]; let out='';
      while (i < source.length) {
        const c=source[i++]; if(c===quote)return out;
        if(c!=='\\'){out+=c;continue;}
        const e=source[i++];
        if(e==='u'||e==='x'){const n=e==='u'?4:2;const hex=source.slice(i,i+n);if(!new RegExp('^[0-9a-f]{'+n+'}$','i').test(hex))throw Error('Escape');out+=String.fromCharCode(parseInt(hex,16));i+=n;}
        else out+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'}[e] ?? e);
      }
      throw Error('String');
    }
    function value(depth=0){
      space();if(depth>50||++count>100000)throw Error('Limit');
      const c=source[i];
      if(c==='"'||c==="'")return string();
      if(c==='['){i++;const a=[];space();while(source[i]!==']'){a.push(value(depth+1));space();if(source[i]!==',')break;i++;space();}if(source[i++]!==']')throw Error('Array');return a;}
      if(c==='{'){i++;const o=Object.create(null);space();while(source[i]!=='}'){let key;if(source[i]==='"'||source[i]==="'")key=string();else{const m=/^[\w$]+/.exec(source.slice(i));if(!m)throw Error('Key');key=m[0];i+=key.length;}space();if(source[i++]!==':')throw Error('Colon');o[key]=value(depth+1);space();if(source[i]!==',')break;i++;space();}if(source[i++]!=='}')throw Error('Object');return o;}
      const m=/^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w$])/.exec(source.slice(i));if(!m)throw Error('Non-data expression');i+=m[0].length;return JSON.parse(m[0]);
    }
    return value();
  }
  function collect(value, out) {
    if(typeof value==='string')out.push(value);
    else if(Array.isArray(value))value.forEach(v=>collect(v,out));
    else if(value&&typeof value==='object')Object.values(value).forEach(v=>collect(v,out));
  }
  function normalize(s){return String(s).replace(/\s+/g,' ').trim();}
  function classify(text) {
    const groups=[
      ['이차전지',/배터리|이차전지|전고체|양극|음극|전구체|리튬|흑연|\b(?:battery|batteries|lib|lfp|ncm|ppes|bess|ess)\b/i],
      ['AI·로보틱스·AX',/로봇|로보틱|휴머노이드|인공지능|피지컬|머신비전|\b(?:ai|ax|robot\w*|physical|machine learning)\b/i],
      ['GX·전력인프라',/수소|암모니아|탈탄소|탄소|재생|전력|전동화|페로브스카이트|리사이클|재자원화|\b(?:gx|ccus|ccu|saf|hydrogen|grid|recycl\w*|co2|co₂|e-fuel)\b/i],
      ['항공우주·방산·첨단기술',/항공|우주|방산|핵융합|양자|반도체|첨단소재|\b(?:aerospace|defense|fusion|quantum|sic)\b/i]
    ];
    const matches=groups.filter(([,re])=>re.test(text)).map(([name])=>name);
    return matches.length?matches:['기타'];
  }
  function parseReport(html, name) {
    const doc=new DOMParser().parseFromString(html,'text/html');
    const strings=[], priorities=new Set();
    const articleArrays=[];
    for(const script of doc.querySelectorAll('script:not([src])')) {
      try {
        if(script.type==='application/json'){
          const data=JSON.parse(script.textContent);collect(data,strings);if(data.articles)articleArrays.push(data.articles);continue;
        }
        const re=/\b(?:const|let|var)\s+(articles|news|data|reportData|briefingData)\s*=\s*/g;let match;
        while((match=re.exec(script.textContent))){try{const data=literal(script.textContent,re.lastIndex);collect(data,strings);if(Array.isArray(data))articleArrays.push(data);else if(data?.articles)articleArrays.push(data.articles);}catch{/* Not a supported data literal. */}}
      }catch{/* Keep static report content available. */}
    }
    for(const articles of articleArrays)for(const a of articles){if(a&&/^(High|Medium|Low)$/i.test(a.priority||''))priorities.add(a.priority[0].toUpperCase()+a.priority.slice(1).toLowerCase());}
    for(const el of doc.querySelectorAll('.badge,.priority,.priority-badge,.high,.medium,.low')){
      const p=normalize(el.textContent);if(/^(High|Medium|Low)$/i.test(p))priorities.add(p[0].toUpperCase()+p.slice(1).toLowerCase());
    }
    doc.querySelectorAll('script,style,noscript,template,.none,#noNew').forEach(el=>el.remove());
    const title=normalize(doc.title)||name;
    const text=normalize((doc.body?.textContent||'')+' '+strings.join(' '));
    return {name,date:name.replace(/\.html?$/i,''),title,text,categories:classify(text),priorities:[...priorities]};
  }
  root.ArchiveParser={literal,parseReport,classify,normalize};
  if(typeof module!=='undefined')module.exports=root.ArchiveParser;
})(typeof globalThis!=='undefined'?globalThis:this);
