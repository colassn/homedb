import importlib.util,sqlite3,tempfile,json,unittest,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('migration','migrate-android.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MigrationTest(unittest.TestCase):
 def test_preserve_every_revision_and_unknown_field(self):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td);db=p/'old.db';con=sqlite3.connect(db);con.execute('CREATE TABLE revisions(seq INTEGER PRIMARY KEY,id TEXT,revision INT,position INT,payload TEXT,changed_at INT)')
   for rev in [1,2]:
    payload=json.dumps({'id':'cash','type':'OPENING','from':0,'to':0,'counts':[rev]+[0]*12,'timestamp':1,'voided':False,'legacyExtra':'keep'})
    con.execute('INSERT INTO revisions VALUES(?,?,?,?,?,?)',(rev,'cash',rev,1,payload,rev))
   con.commit();con.close();before=db.read_bytes()
   pref=p/'device_layout_v1.xml';pref.write_text('<map><string name="sd_cards">[{"name":"A01","capacity":"128 GB","custom":"keep"}]</string><string name="console_memos_v1">[{"id":"m1","title":"備忘","note":"內容","deleted":true}]</string></map>')
   result=m.convert(db,[pref]);self.assertEqual(len(result['revisions']),2);self.assertEqual(result['cards'][0]['custom'],'keep');self.assertTrue(result['memos'][0]['deleted']);self.assertEqual(db.read_bytes(),before);self.assertEqual(result['cards'][0]['id'],m.convert(db,[pref])['cards'][0]['id'])
 def test_corrupt_json_stops(self):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td);db=p/'old.db';con=sqlite3.connect(db);con.execute('CREATE TABLE revisions(seq INTEGER PRIMARY KEY,id TEXT,revision INT,position INT,payload TEXT,changed_at INT)');con.commit();con.close();pref=p/'device_layout_v1.xml';pref.write_text('<map><string name="sd_cards">broken</string></map>')
   with self.assertRaises(json.JSONDecodeError):m.convert(db,[pref])
if __name__=='__main__':unittest.main()
