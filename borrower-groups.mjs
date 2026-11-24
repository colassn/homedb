// Display aliases belong to this device. Ledger keys and repayment allocations stay exact.
const key='pos-borrower-groups-v1';
export function aliases(){
 try{
  const pairs=JSON.parse(localStorage.getItem(key)||'[]');
  return new Map(pairs.filter(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(name=>typeof name==='string'&&name)));
 }catch{return new Map();}
}
export function groupedName(name,map){return map.get(name)||name;}
export function joinGroup(source,target,names){
 if(!names.includes(source)||!names.includes(target))throw Error('借款人紀錄已更新，請重新選擇。');
 const map=aliases(),from=groupedName(source,map),to=groupedName(target,map);
 if(from===to)return;
 for(const name of names)if(groupedName(name,map)===from)map.set(name,to);
 localStorage.setItem(key,JSON.stringify([...map]));
}
export function separateGroup(name){
 const map=aliases(),root=groupedName(name,map);
 for(const [member,label] of map)if(label===root)map.delete(member);
 localStorage.setItem(key,JSON.stringify([...map]));
}
