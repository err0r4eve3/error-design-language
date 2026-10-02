'use strict';
// Native ES modules + an import map; no transpilation, network, or dependency install.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const files=['domain','service','store','ui','views','app'];
function build(){
 const sources=Object.fromEntries(files.map(n=>[n,fs.readFileSync(path.join(__dirname,n+'.mjs'),'utf8')]));
 for(const text of Object.values(sources))for(const m of text.matchAll(/from ['"]([^'"]+)['"]/g))if(!files.some(n=>m[1]==='#relay/'+n))throw new Error('Unexpected module import');
 const imports=Object.fromEntries(files.map(n=>['#relay/'+n,'data:text/javascript;base64,'+Buffer.from(sources[n]).toString('base64')]));
 const css=fs.readFileSync(path.join(root,'assets/tokens.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'panel.css'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'shell.html'),'utf8').replace('/*__STYLES__*/',css).replace('/*__IMPORTS__*/',JSON.stringify({imports}));
 const inputs=['assets/tokens.css',...files.map(n=>'examples/panel/'+n+'.mjs'),'examples/panel/panel.css','examples/panel/shell.html','examples/panel/build.cjs','examples/panel/package.json'];
 return {html,manifest:Object.fromEntries(inputs.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')]))};
}
if(require.main===module){try{const out=process.argv[2];if(!out)throw new Error('Usage: node examples/panel/build.cjs /outside/source/panel.html');const target=path.resolve(out),parent=fs.realpathSync(path.dirname(target)),dest=path.join(parent,path.basename(target));if(dest===root||dest.startsWith(root+path.sep))throw new Error('Output must be outside source');const b=build();fs.writeFileSync(dest,b.html,{flag:'wx'});console.log(JSON.stringify({path:dest,bytes:Buffer.byteLength(b.html),sources:b.manifest},null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={build};
