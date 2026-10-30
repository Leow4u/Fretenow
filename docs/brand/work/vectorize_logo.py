"""Reconstruct the approved FreteNow raster as native, editable SVG paths.

Read-only use of the approved PNG. No font substitution and no image embedding.
Requires Python, Pillow, NumPy and SciPy. Output is a faithful reconstruction,
not an assertion that an original designer's vector master was recovered.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = Path(r"C:\Users\leona\.codex\generated_images\01a18a74-2c2a-70e2-af3e-c35de2633f96\exec-c35488db-8687-42a9-ae5d-d313f70fa684.png")
PALETTE = {"navy": "#0A1F4E", "blue": "#0177FD", "sky": "#7DB8FF", "white": "#FFFFFF", "black": "#000000"}
TOLERANCE = 0.45


def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else np.zeros_like(v)


def contours(field, level=0.5):
    """Marching squares with interpolated pixel-centre coordinates."""
    h, w = field.shape
    a = field >= level
    codes = a[:-1, :-1] + 2*a[:-1, 1:] + 4*a[1:, 1:] + 8*a[1:, :-1]
    table = {1:[(0,3)],2:[(0,1)],3:[(3,1)],4:[(1,2)],5:[(0,3),(1,2)],6:[(0,2)],7:[(3,2)],8:[(3,2)],9:[(0,2)],10:[(0,1),(2,3)],11:[(1,2)],12:[(3,1)],13:[(0,1)],14:[(0,3)]}
    nodes, adjacent = {}, {}
    def edge(x, y, e):
        if e == 0: key, p, q = ("h",x,y), (x,y), (x+1,y)
        elif e == 1: key, p, q = ("v",x+1,y), (x+1,y), (x+1,y+1)
        elif e == 2: key, p, q = ("h",x,y+1), (x,y+1), (x+1,y+1)
        else: key, p, q = ("v",x,y), (x,y), (x,y+1)
        if key not in nodes:
            v0, v1 = field[p[1],p[0]], field[q[1],q[0]]
            t = float((level-v0)/(v1-v0))
            nodes[key] = np.array(p, float) + t*(np.array(q)-p)
            adjacent[key] = []
        return key
    for y, x in zip(*np.where((codes > 0) & (codes < 15))):
        for e0,e1 in table[int(codes[y,x])]:
            k0,k1 = edge(x,y,e0),edge(x,y,e1)
            adjacent[k0].append(k1)
            adjacent[k1].append(k0)
    loops, remaining = [], set(nodes)
    while remaining:
        start = min(remaining, key=lambda k:(k[2],k[1],k[0]))
        current, previous, loop = start, None, []
        while True:
            remaining.discard(current)
            loop.append(nodes[current])
            choices = adjacent[current]
            nxt = choices[0] if choices[0] != previous else choices[1]
            previous,current = current,nxt
            if current == start: break
        arr = np.asarray(loop)
        area = abs(float(np.sum(arr[:,0]*np.roll(arr[:,1],-1)-arr[:,1]*np.roll(arr[:,0],-1))/2))
        if area > 8: loops.append(arr)
    return loops


def bezier(ctrl, t):
    t = np.asarray(t)
    mt = 1-t
    return mt[...,None]**3*ctrl[0] + (3*mt*mt*t)[...,None]*ctrl[1] + (3*mt*t*t)[...,None]*ctrl[2] + t[...,None]**3*ctrl[3]


def generate_bezier(points, u, left, right):
    mt = 1-u
    b0,b1,b2,b3 = mt**3,3*u*mt**2,3*u*u*mt,u**3
    aa = b1[:,None]*left
    ab = b2[:,None]*right
    residual = points-(b0+b1)[:,None]*points[0]-(b2+b3)[:,None]*points[-1]
    c = np.array([[np.sum(aa*aa),np.sum(aa*ab)],[np.sum(aa*ab),np.sum(ab*ab)]])
    z = np.array([np.sum(aa*residual),np.sum(ab*residual)])
    try: alphas = np.linalg.solve(c,z)
    except np.linalg.LinAlgError: alphas = np.array([-1.,-1.])
    length = np.linalg.norm(points[-1]-points[0])
    if np.any(alphas < length*1e-6) or np.any(alphas > length*3): alphas = np.array([length/3,length/3])
    return np.array([points[0],points[0]+alphas[0]*left,points[-1]+alphas[1]*right,points[-1]])


def fit_cubic(points, left, right, tolerance=TOLERANCE):
    if len(points) == 2:
        length = np.linalg.norm(points[1]-points[0])/3
        return [np.array([points[0],points[0]+length*left,points[1]+length*right,points[1]])]
    steps = np.linalg.norm(np.diff(points,axis=0),axis=1)
    u = np.r_[0,np.cumsum(steps)]
    u /= u[-1]
    curve = generate_bezier(points,u,left,right)
    errors = np.linalg.norm(bezier(curve,u)-points,axis=1)
    split = int(np.argmax(errors))
    if errors[split] <= tolerance: return [curve]
    split = min(len(points)-2,max(1,split))
    tangent = unit(points[split-1]-points[split+1])
    return fit_cubic(points[:split+1],left,tangent,tolerance) + fit_cubic(points[split:],-tangent,right,tolerance)


def fit_loop(points):
    """Separate sharp turns, then fit smooth cubic spans to subpixel outlines."""
    n = len(points)
    delta = 5
    before = points-np.roll(points,delta,axis=0)
    after = np.roll(points,-delta,axis=0)-points
    dot = np.sum(before*after,axis=1)/np.maximum(1e-9,np.linalg.norm(before,axis=1)*np.linalg.norm(after,axis=1))
    turns = np.arccos(np.clip(dot,-1,1))
    candidates = np.where(turns > 0.9)[0]
    corners = []
    for i in sorted(candidates,key=lambda i:-turns[i]):
        if all(min(abs(i-j),n-abs(i-j)) > 8 for j in corners): corners.append(int(i))
    if len(corners) < 2:
        corners = [int(np.argmin(points[:,0])),int(np.argmax(points[:,0]))]
    corners = sorted(set(corners))
    curves = []
    for k,start in enumerate(corners):
        end = corners[(k+1)%len(corners)]
        if end <= start: arc = np.concatenate([points[start:],points[:end+1]])
        else: arc = points[start:end+1]
        if len(arc) < 2: continue
        curves.extend(fit_cubic(arc,unit(arc[min(3,len(arc)-1)]-arc[0]),unit(arc[max(0,len(arc)-4)]-arc[-1])))
    return curves


def path_data(loops, origin):
    # Raster samples are indexed at integer centres. SVG coverage is sampled at
    # half-integer centres, so retain that half-pixel when moving into SVG space.
    centre_offset = np.array([0.5,0.5])
    parts = []
    for loop in loops:
        first = loop[0][0]-origin+centre_offset
        parts.append(f"M{first[0]:.3f} {first[1]:.3f}")
        for curve in loop:
            p = curve[1:]-origin+centre_offset
            parts.append("C"+" ".join(f"{v:.3f}" for v in p.ravel()))
        parts.append("Z")
    return " ".join(parts)


def svg(components, crop, variant, symbol=False):
    x0,y0,x1,y1 = crop
    width,height = x1-x0,y1-y0
    title = "FreteNow — "+("símbolo" if symbol else "logo horizontal")+" — "+variant
    desc = "Reconstrução vetorial fiel do conceito aprovado. Contornos em curvas Bézier; sem fonte dependente e sem imagem incorporada. Fundo transparente."
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">', f'<title id="title">{title}</title>', f'<desc id="desc">{desc}</desc>']
    for c in components:
        if symbol and not c["symbol"]: continue
        color = PALETTE[c["color"]]
        if variant == "reverso" and c["color"] == "navy": color = PALETTE["white"]
        elif variant.startswith("mono-"): color = PALETTE[{"mono-marinho":"navy","mono-preto":"black","mono-branco":"white"}[variant]]
        d = path_data(c["curves"],np.array([x0,y0]))
        lines.append(f'<path id="{c["id"]}" fill="{color}" fill-rule="evenodd" d="{d}"/>')
    lines.append('</svg>')
    return "\n".join(lines)+"\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,default=DEFAULT_SOURCE)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    im = np.asarray(Image.open(args.source).convert("RGB"),dtype=float)
    mask = (im[:,:,2]-im[:,:,0]>35)&(im[:,:,0]<190)
    labels,n = ndimage.label(mask)
    components = []
    positions = []
    for lab in range(1,n+1):
        ys,xs = np.where(labels==lab)
        if len(xs)<50: continue
        positions.append((int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max()),lab))
    positions.sort(key=lambda p:p[0])
    names = ["mark-left","mark-top","mark-front-upper","mark-front-lower","word-F","word-r","word-e-1","word-t","word-e-2","word-N","word-o","word-w"]
    for name,(x0,y0,x1,y1,lab) in zip(names,positions):
        symbol = name.startswith("mark")
        color = "sky" if name=="mark-top" else "blue" if name in ["mark-front-upper","mark-front-lower","word-N","word-o","word-w"] else "navy"
        pad = 6
        xx0,yy0,xx1,yy1 = x0-pad,y0-pad,x1+pad+1,y1+pad+1
        red = im[yy0:yy1,xx0:xx1,0]
        interior = 89 if color=="sky" else 4 if color=="navy" else 0
        field = np.clip((241-red)/(241-interior),0,1)
        field = ndimage.gaussian_filter(field,0.6)
        # Suppress nearby but unrelated components; padded crops can include
        # a neighbouring glyph separated by just a few pixels.
        region = ndimage.binary_dilation(labels[yy0:yy1,xx0:xx1]==lab,iterations=3)
        field *= region
        loops = contours(field)
        loops = [p+np.array([xx0,yy0]) for p in loops]
        curves = [fit_loop(loop) for loop in loops]
        components.append({"id":name,"color":color,"symbol":symbol,"curves":curves,"sourceBounds":[x0,y0,x1,y1],"contours":len(curves),"curveCount":sum(map(len,curves))})
    logo_crop = [317,269,1627,524]
    mark_crop = [317,269,570,524]
    out = ROOT / "docs/brand/assets/svg"
    out.mkdir(parents=True,exist_ok=True)
    variants = ["colorido","reverso","mono-marinho","mono-preto","mono-branco"]
    files = []
    for symbol in [False,True]:
        for variant in variants:
            name = f'fretenow-{"simbolo" if symbol else "logo-horizontal"}-{variant}.svg'
            content = svg(components,mark_crop if symbol else logo_crop,variant,symbol)
            ET.fromstring(content)
            (out/name).write_text(content,encoding="utf-8")
            files.append("docs/brand/assets/svg/"+name)
    mark_paths = [{"id":c["id"],"fill":PALETTE[c["color"]],"d":path_data(c["curves"],np.array(mark_crop[:2]))} for c in components if c["symbol"]]
    metadata = {
        "notice":"Reconstrução vetorial fiel do conceito FreteNow aprovado, a partir do PNG de referência; não é arquivo vetorial original recuperado. A forma do wordmark é preservada em contornos, sem substituição tipográfica.",
        "method":"Read-only raster analysis; interpolated isocontours at 50% foreground, Gaussian field smoothing sigma 0.6 source pixels, adaptive cubic Bézier fitting with 0.45 px sample tolerance; even-odd counters. Half-pixel offset converts raster sample centres to SVG coordinates. Palette normalized to approved solid brand colors.",
        "source":{"path":str(args.source),"sha256":hashlib.sha256(raw).hexdigest(),"dimensions":[im.shape[1],im.shape[0]],"unchanged":args.source.read_bytes()==raw},
        "palette":PALETTE,
        "logo":{"viewBox":[0,0,1310,255],"aspectRatio":1310/255,"sourceCrop":logo_crop,"principalFile":"docs/brand/assets/svg/fretenow-logo-horizontal-colorido.svg"},
        "symbol":{"viewBox":[0,0,253,255],"aspectRatio":253/255,"sourceCrop":mark_crop,"principalFile":"docs/brand/assets/svg/fretenow-simbolo-colorido.svg","paths":mark_paths},
        "components":[{k:v for k,v in c.items() if k!="curves"} for c in components],
        "files":files,
        "background":"Every SVG has transparent background. Reverso is intended for navy backgrounds; mono-branco requires a dark background.",
        "qa":{"xmlParsing":"all SVG files parsed successfully", "sourceUnchanged":args.source.read_bytes()==raw,"fonts":0,"embeddedRasterImages":0,"visualRender":"pending"}
    }
    meta = ROOT / "docs/brand/work/logo-geometry.json"
    meta.parent.mkdir(parents=True,exist_ok=True)
    meta.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"files":len(files),"componentCount":len(components),"contours":sum(c["contours"] for c in components),"curveCount":sum(c["curveCount"] for c in components),"logo":metadata["logo"],"symbolViewBox":metadata["symbol"]["viewBox"],"sourceUnchanged":metadata["qa"]["sourceUnchanged"]},indent=2))


if __name__ == "__main__": main()
