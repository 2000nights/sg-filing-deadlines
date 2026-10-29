import json, glob, os, datetime as dt
from openpyxl import load_workbook
out={}
for fn in sorted(glob.glob('/workspace/scout/sg-compliance-tracker/tests/recalculated/*.xlsx')):
    name=os.path.basename(fn)[:-5]
    wb=load_workbook(fn,data_only=True)
    su=wb['Setup']; setup={}
    for r in range(5,60):
        k=su.cell(r,2).value; v=su.cell(r,3).value
        if k: setup[k]=v.date().isoformat() if isinstance(v,dt.datetime) else v
    tr=wb['Tracker']; rows=[]
    def t(v): return v.date().isoformat() if isinstance(v,dt.datetime) else (v.isoformat() if isinstance(v,dt.date) else v)
    for r in range(5,tr.max_row+1):
        ob=tr.cell(r,3).value
        if not ob: continue
        rows.append(dict(ob=ob,period=t(tr.cell(r,4).value),due=t(tr.cell(r,5).value),actby=t(tr.cell(r,6).value),applies=tr.cell(r,7).value,flag=tr.cell(r,11).value,days=tr.cell(r,10).value,type=tr.cell(r,17).value))
    out[name]=dict(setup=setup,rows=rows)
json.dump(out,open('tests/workbook_expected.json','w'),indent=1,default=str)
for k,v in out.items(): print(k,len(v['rows'])); 
print(json.dumps(out['A_FYE31Dec_GSTq_staff']['setup'],indent=1,default=str))
print(out['A_FYE31Dec_GSTq_staff']['rows'][:12])
