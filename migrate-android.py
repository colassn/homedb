#!/usr/bin/env python3
"""Read-only Android 0.6.5/0.6.6 converter. Originals never overwritten."""
import argparse,base64,hashlib,json,sqlite3,subprocess,tempfile,time,zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
PKG='hk.personalos.preview.test'
def prefs(path):
    if not path.exists(): return {}
    result={}
    for e in ET.fromstring(path.read_bytes()):
        k=e.attrib.get('name')
        result[k]=e.text or '' if e.tag=='string' else e.attrib.get('value',e.text)
    return result

def convert(db,pref_files):
    con=sqlite3.connect(f'file:{db.resolve()}?mode=ro',uri=True)
    if con.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('SQLite 檢查失敗；未產生轉換檔')
    con.row_factory=sqlite3.Row
    rows=[dict(r) for r in con.execute('SELECT seq,id,revision,position,payload,changed_at FROM revisions ORDER BY seq')];con.close()
    for r in rows:
        e=json.loads(r['payload'])
        if e['id']!=r['id'] or len(e['counts'])!=13:raise ValueError('交易格式不符')
    allprefs={p.name:prefs(p) for p in pref_files}; combined={k:v for d in allprefs.values() for k,v in d.items()}
    cards=json.loads(combined.get('sd_cards','[]')); memos=json.loads(combined.get('console_memos_v1','[]'))
    if not isinstance(cards,list) or not isinstance(memos,list):raise ValueError('卡片或備忘格式不符')
    # Stable identities: repeated export/import does not create duplicates.
    for i,c in enumerate(cards):
        c.setdefault('id','android-sd-'+str(i));c.setdefault('updated',0);c.setdefault('deleted',False);c.setdefault('archived',False)
    for i,m in enumerate(memos):
        m['id']=str(m.get('id','android-memo-'+str(i)));m.setdefault('title',m.get('text','未命名備忘'));m.setdefault('note','');m.setdefault('updated',m.get('time',0));m.setdefault('done',False);m.setdefault('deleted',False)
    return {'format':'PersonalOS-android-export','schema':1,'revisions':rows,'memos':memos,'cards':cards,'legacyPreferences':allprefs,'sourcePackage':PKG,'exportedAt':int(time.time()*1000)}

def adb_export(target):
    def adb(*args,allow_missing=False):
        r=subprocess.run(['adb',*args],capture_output=True)
        if r.returncode and not allow_missing:raise RuntimeError(r.stderr.decode(errors='replace') or 'ADB 未能讀取；未清除或修改資料')
        return r.stdout if r.returncode==0 else None
    # Stop the app to obtain a consistent DB/WAL + preferences snapshot. No pm clear/uninstall.
    adb('shell','am','force-stop',PKG)
    for name in ['personalos_preview_v1.db','personalos_preview_v1.db-wal','personalos_preview_v1.db-shm']:
        raw=adb('exec-out','run-as',PKG,'cat','databases/'+name,allow_missing=name.endswith(('-wal','-shm')))
        if raw is not None:(target/name).write_bytes(raw)
    listing=adb('exec-out','run-as',PKG,'ls','shared_prefs').decode().splitlines()
    for name in listing:
        if name in ['device_layout_v1.xml','personalos_drafts_v1.xml','console_firebase.xml']:
            (target/name).write_bytes(adb('exec-out','run-as',PKG,'cat','shared_prefs/'+name))
    # Backup SQLite via its API so the WAL is included in the output.
    src=sqlite3.connect(str(target/'personalos_preview_v1.db')); dest=sqlite3.connect(str(target/'consistent.db'));src.backup(dest);dest.close();src.close()
    return target/'consistent.db',list(target.glob('*.xml'))

def main():
    a=argparse.ArgumentParser(description='只讀轉換 PersonalOS 原有資料；不清除手機資料。')
    a.add_argument('--db',type=Path);a.add_argument('--prefs',type=Path,nargs='*',default=[]);a.add_argument('--adb',action='store_true');a.add_argument('--output',type=Path,default=Path('PersonalOS-android-export.json'));args=a.parse_args()
    if args.output.exists():raise SystemExit('輸出檔已存在；請另取檔名，避免覆蓋備份。')
    if args.adb:
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);db,ps=adb_export(d);payload=convert(db,ps)
            # Include original bytes in a flat backup ZIP next to the JSON.
            backup=args.output.with_suffix('.original.zip')
            if backup.exists():raise SystemExit('原始備份檔已存在，停止避免覆蓋。')
            with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
                for p in d.iterdir():z.write(p,p.name)
    elif args.db:payload=convert(args.db,args.prefs)
    else:a.error('請使用 --adb 或 --db 加 --prefs')
    args.output.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'已輸出 {args.output}：{len(payload["revisions"])} 筆修訂、{len(payload["memos"])} 筆備忘、{len(payload["cards"])} 張卡片。')
if __name__=='__main__':main()
