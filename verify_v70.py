# -*- coding: utf-8 -*-
from collections import deque
from copy import deepcopy

G = [
    [(1,1),(2,1)],[(1,2),(2,2),(3,2)],[(2,4),(2,5)],
    [(3,1),(4,1)],[(3,4),(4,4)],[(3,5),(3,6)],
    [(4,5),(5,5)],[(4,6),(5,6)],[(5,1),(5,2)],
    [(5,3),(5,4)],[(6,2),(6,3),(6,4)]
]
TGT_IDX=4

def build(groups,gi):
    bs=[];oi=0
    for i,cel in enumerate(groups):
        cel=sorted(cel);r1,c1=cel[0];r2,c2=cel[-1]
        if i==gi:bid="G"
        else:
            while True:
                bid=chr(65+oi);oi+=1
                if bid!="G":break
        bs.append({"id":bid,"orient":"v" if r2>r1 else "h","sz":len(cel),
                   "r":r1-1,"c":c1-1,"cells":[(r-1,c-1) for r,c in cel]})
    return bs

def pg(bs):
    g=[["."]*7 for _ in range(7)]
    for b in bs:
        for r,c in b["cells"]:g[r][c]=b["id"]
    print("  1 2 3 4 5 6")
    for r in range(6):print(f"{r+1} "+" ".join(g[r][c] for c in range(6)))

def slide_strict(bl,bid,dr,dc):
    x=next((b for b in bl if b["id"]==bid),None)
    if not x: return None
    if x["orient"]=="v" and dc!=0: return None
    if x["orient"]=="h" and dr!=0: return None
    nr,nc=x["r"]+dr,x["c"]+dc
    occ=set()
    for y in bl:
        for r,c in y["cells"]:occ.add((r,c))
    ncells=[(nr+j if x["orient"]=="v" else nr, nc if x["orient"]=="v" else nc+j) for j in range(x["sz"])]
    for r,c in ncells:
        if not(0<=r<6 and 0<=c<6): return None
        if (r,c) in occ and (r,c) not in x["cells"]: return None
    while True:
        nr2,nc2=nr+dr,nc+dc
        ncells2=[(nr2+j if x["orient"]=="v" else nr2, nc2 if x["orient"]=="v" else nc2+j) for j in range(x["sz"])]
        if any(not(0<=r<6 and 0<=c<6) for r,c in ncells2): break
        if any((r,c) in occ and (r,c) not in x["cells"] for r,c in ncells2): break
        nr,nc=nr2,nc2
    dist=abs(nr-x["r"]) if dr else abs(nc-x["c"])
    ncells=[(nr+j if x["orient"]=="v" else nr, nc if x["orient"]=="v" else nc+j) for j in range(x["sz"])]
    nb=deepcopy(x); nb["r"]=nr; nb["c"]=nc; nb["cells"]=ncells
    res=[]
    for y in bl:
        if y["id"]==bid: res.append(nb)
        else: res.append(deepcopy(y))
    dir_n='←' if dc<0 else '→' if dc>0 else '↓' if dr>0 else '↑'
    return res, f"{bid}{dir_n}{dist}"

bs=build(G,TGT_IDX)
print("初始:"); pg(bs)

def bfs(bs):
    def ser(bl):
        return tuple((b["id"],b["r"],b["c"]) for b in bl)
    start=ser(bs)
    q=deque([(start,0,[])])
    vis={start}; total=0
    while q:
        state,dist,path=q.popleft(); total+=1
        cur=[]
        for bid,rr,cc in state:
            for ob in bs:
                if ob["id"]==bid:
                    nb=deepcopy(ob); nb["r"]=rr; nb["c"]=cc
                    dr,dc=rr-ob["r"],cc-ob["c"]
                    nb["cells"]=[(cr+dr,cc2+dc) for cr,cc2 in ob["cells"]]
                    cur.append(nb); break
        g=next((b for b in cur if b["id"]=="G"),None)
        if g["r"]==4 and g["c"]==3:
            print(f"\n✅ 通关！{dist}步")
            for i,p in enumerate(path): print(f"  {i+1}: {p}")
            return dist
        for b in cur:
            dirs=[(0,-1),(0,1)] if b["orient"]=="h" else [(-1,0),(1,0)]
            for dr,dc in dirs:
                r=slide_strict(cur,b["id"],dr,dc)
                if r:
                    nb,desc=r
                    ns=ser(nb)
                    if ns not in vis:
                        vis.add(ns)
                        q.append((ns,dist+1,path+[desc]))
    print(f"\n❌ 无解！搜索{total}")
    return None

r=bfs(bs)
if r: print(f"用户标22步，实际{r}步")
