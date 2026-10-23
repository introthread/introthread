// usage: node conv.js file.js [--apply]   converts simple on<evt>="..." to data-on-<evt>="..."
const fs=require('fs');
global.window={};global.document={addEventListener(){}};global.Element=function(){};
eval(fs.readFileSync(require('path').join(__dirname,'..','js','actions.js'),'utf8'));
const ACT=window.ACT;
const f=process.argv[2],apply=process.argv.includes('--apply');
// --only fnA,fnB : convert only inside these top-level functions (by name; 'name=' for reassignments). Needs acorn.
const onlyArg=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7);
let ranges=null;
if(onlyArg){
  let acorn;try{acorn=require('acorn')}catch(e){acorn=require('/home/user/node_modules/acorn')}
  const want=new Set(onlyArg.split(','));ranges=[];
  const src0=fs.readFileSync(f,'utf8');
  for(const n of acorn.parse(src0,{ecmaVersion:'latest'}).body){
    let name=null;
    if(n.type==='FunctionDeclaration')name=n.id.name;
    else if(n.type==='VariableDeclaration')name=n.declarations.map(d=>d.id.name).join(',');
    else if(n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.name)name=n.expression.left.name+'=';
    if(name&&want.has(name))ranges.push([n.start,n.end]);
  }
}
const inRange=i=>!ranges||ranges.some(([a,b])=>i>=a&&i<b);
let s=fs.readFileSync(f,'utf8');
const re=/ on(click|dblclick|change|input|submit|keydown|keyup|paste|mousemove|focus|blur|mouseenter|mouseleave)=(\\?)(["'])/g;
let out='',last=0,conv=0;const left=[];let m;
while((m=re.exec(s))){
  const delim=m[2]+m[3];let i=m.index+m[0].length,start=i;
  while(i<s.length){
    if(s.startsWith('${',i)){let d=1;i+=2;while(i<s.length&&d){if(s[i]==='{')d++;else if(s[i]==='}')d--;i++;}continue;}
    if(s.startsWith(delim,i)&&!(delim.length===1&&s[i-1]==='\\'))break;
    i++;
  }
  const raw=s.slice(start,i);
  let probe=raw.replace(/\$\{/g,'\u0001');
  // replace each ${...} (balanced) with 0
  let p='',k=0;while(k<raw.length){if(raw.startsWith('${',k)){let d=1;k+=2;while(k<raw.length&&d){if(raw[k]==='{')d++;else if(raw[k]==='}')d--;k++;}p+='0';continue;}p+=raw[k++];}
  if(m[2]==='\\') p=p.replace(/\\(["'])/g,'$1');
  p=p.replace(/\\\\/g,'\\');
  let ok=true;try{ACT.parse(p)}catch(e){ok=false}
  const line=s.slice(0,m.index).split('\n').length;
  if(!inRange(m.index)){re.lastIndex=i+delim.length;continue;}
  if(ok){out+=s.slice(last,m.index)+' data-on-'+m[1]+'='+delim;last=m.index+m[0].length;conv++;}
  else left.push(line+': on'+m[1]+'='+raw.slice(0,110));
  re.lastIndex=i+delim.length;
}
out+=s.slice(last);
console.log(f,'converted',conv,'left',left.length);left.forEach(x=>console.log('  '+x));
if(apply)fs.writeFileSync(f,out);
