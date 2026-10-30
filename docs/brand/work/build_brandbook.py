"""FreteNow brandbook v1.0. Editorial/vector artifacts, never product code."""
from pathlib import Path
import sys, os, tempfile, json, math, re, hashlib, shutil, zipfile
from xml.etree import ElementTree as ET
sys.path.insert(0, str(Path.home() / 'AppData' / 'Local' / 'Temp' / 'fretenow-brandbook-deps'))
from fontTools.ttLib import TTFont as Font
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.svgLib.path import parse_path
from fontTools.pens.basePen import BasePen
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[3]
BRAND = ROOT / 'docs' / 'brand'
WORK = BRAND / 'work'
OUT = ROOT / 'output' / 'brandbook'
ASSETS = BRAND / 'assets'
for p in (OUT, WORK / 'fonts', OUT / 'applications', OUT / 'qa'):
    p.mkdir(parents=True, exist_ok=True)
W,H = 960,600
NAVY='#0A1F4E'; BLUE='#0177FD'; SKY='#7DB8FF'; ACTION='#0166D9'; LINK='#0A5FC7'
BG='#F2F4F8'; WHITE='#FFFFFF'; INK='#1A1A1A'; MUTED='#56647B'; LINE='#D8DFEA'
GREEN='#14733A'; RED='#B91C1C'; AMBER='#9A4C05'

class CanvasPen(BasePen):
    def __init__(self,c):
        super().__init__(None);self.path=c.beginPath()
    def _moveTo(self,p):self.path.moveTo(*p)
    def _lineTo(self,p):self.path.lineTo(*p)
    def _curveToOne(self,a,d,e):self.path.curveTo(*a,*d,*e)
    def _closePath(self):self.path.close()
    def _endPath(self):pass

def fonts():
    defs=[('Display','BricolageGrotesque-Variable.ttf',{'wght':650,'wdth':100,'opsz':48}),
          ('DisplayBold','BricolageGrotesque-Variable.ttf',{'wght':750,'wdth':100,'opsz':48}),
          ('Body','InstrumentSans-Variable.ttf',{'wght':400,'wdth':100}),
          ('Medium','InstrumentSans-Variable.ttf',{'wght':550,'wdth':100}),
          ('Bold','InstrumentSans-Variable.ttf',{'wght':700,'wdth':100})]
    for name,filename,axes in defs:
        p=WORK/'fonts'/f'{name}.ttf'
        if not p.exists():
            f=Font(ASSETS/'fonts'/filename)
            instantiateVariableFont(f,axes,inplace=True).save(p)
        pdfmetrics.registerFont(TTFont(name,str(p)))
fonts()

def rgb(h): return tuple(int(h[i:i+2],16)/255 for i in (1,3,5))
def luminance(h):
    return sum(v*k for v,k in zip([v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb(h)],(.2126,.7152,.0722)))
def contrast(a,b):
    x,y=sorted([luminance(a),luminance(b)]);return (y+.05)/(x+.05)

class Book:
    def __init__(self,path,size=(W,H),footer=True):
        self.c=canvas.Canvas(str(path),pagesize=size,pageCompression=1)
        self.c.setTitle('FreteNow | Brandbook 1.0')
        self.c.setAuthor('FreteNow')
        self.c.setSubject('Identidade, comunicação e aplicações Web, iOS e Android')
        self.w,self.h=size;self.n=0;self.footer=footer;self.records=[]
    def rect(self,x,y,w,h,fill,stroke=None,r=0,lw=1):
        c=self.c;c.setFillColor(HexColor(fill));c.setLineWidth(lw)
        if stroke:c.setStrokeColor(HexColor(stroke))
        if r:c.roundRect(x,self.h-y-h,w,h,r,fill=1,stroke=int(bool(stroke)))
        else:c.rect(x,self.h-y-h,w,h,fill=1,stroke=int(bool(stroke)))
    def line(self,x1,y1,x2,y2,color=LINE,lw=1):
        self.c.setStrokeColor(HexColor(color));self.c.setLineWidth(lw);self.c.line(x1,self.h-y1,x2,self.h-y2)
    def text(self,text,x,y,size=12,font='Body',color=INK,maxw=None,leading=None):
        text=str(text).replace('\u2011','-').replace('\u2013','-').replace('\u2014','-').replace('≥','>=').replace('→',' > ').replace('−','-')
        lines=[]
        for paragraph in text.split('\n'):
            line=''
            for word in paragraph.split():
                test=(line+' '+word).strip()
                if maxw and pdfmetrics.stringWidth(test,font,size)>maxw and line:
                    lines.append(line);line=word
                else:line=test
            lines.append(line)
        for i,line in enumerate(lines):
            self.c.setFont(font,size);self.c.setFillColor(HexColor(color));self.c.drawString(x,self.h-y-size*.82-i*(leading or size*1.4),line)
        return y+len(lines)*(leading or size*1.4)
    def tag(self,text,x,y,fill=BG,color=LINK):
        width=pdfmetrics.stringWidth(text,'Bold',9)+18
        self.rect(x,y,width,22,fill,r=11);self.text(text,x+9,y+6,9,'Bold',color);return width
    def svg(self,filename,x,y,width=None,height=None):
        path=Path(filename)
        aliases={'symbol-color.svg':'fretenow-simbolo-colorido.svg','symbol-white.svg':'fretenow-simbolo-mono-branco.svg','symbol-navy.svg':'fretenow-simbolo-mono-marinho.svg','logo-horizontal-color.svg':'fretenow-logo-horizontal-colorido.svg','logo-horizontal-reverse.svg':'fretenow-logo-horizontal-reverso.svg','logo-horizontal-white.svg':'fretenow-logo-horizontal-mono-branco.svg','logo-horizontal-navy.svg':'fretenow-logo-horizontal-mono-marinho.svg','logo-horizontal-black.svg':'fretenow-logo-horizontal-mono-preto.svg'}
        if filename in aliases:path=Path(aliases[filename])
        if not path.is_absolute():path=ASSETS/'svg'/path
        root=ET.parse(path).getroot();view=list(map(float,root.attrib.get('viewBox','0 0 100 100').split()))
        vx,vy,vw,vh=view
        if width is None:width=height*vw/vh
        scale=width/vw;hh=vh*scale
        c=self.c;c.saveState();c.translate(x,self.h-y);c.scale(scale,-scale);c.translate(-vx,-vy)
        def walk(el, inherited=INK):
            color=el.attrib.get('fill',inherited)
            if el.tag.split('}')[-1]=='path' and color!='none':
                pen=CanvasPen(c);parse_path(el.attrib['d'],pen)
                c.setFillColor(HexColor(color));c.drawPath(pen.path,fill=1,stroke=0,fillMode=0)
            for child in el:walk(child,color)
        walk(root);c.restoreState();return hh
    def mark(self,x,y,s=60,variant='color'):
        return self.svg({'color':'symbol-color.svg','white':'symbol-white.svg','navy':'symbol-navy.svg','reverse':'fretenow-simbolo-reverso.svg'}.get(variant,variant),x,y,width=s)
    def logo(self,x,y,w=210,variant='color'):
        return self.svg({'color':'logo-horizontal-color.svg','reverse':'logo-horizontal-reverse.svg','white':'logo-horizontal-white.svg','navy':'logo-horizontal-navy.svg','black':'logo-horizontal-black.svg'}[variant],x,y,width=w)
    def start(self,section,title=None,sub=None,dark=False,key=None):
        self.n+=1;self.dark=dark;self.records.append({'page':self.n,'section':section,'title':title or section})
        self.rect(0,0,self.w,self.h,NAVY if dark else WHITE)
        if key:self.c.bookmarkPage(key);self.c.addOutlineEntry(title or section,key,0,False)
        if title:
            self.text(section.upper(),48,31,9,'Bold',SKY if dark else LINK)
            self.text(title,48,65,35,'Display',WHITE if dark else NAVY,maxw=860,leading=39)
            if sub:self.text(sub,49,116,12,'Body','#C9D8F0' if dark else MUTED,maxw=850,leading=17)
    def end(self):
        if self.footer:
            self.line(48,self.h-37,self.w-48,self.h-37,'#34476A' if self.dark else LINE,.6)
            self.text('FRETENOW / BRANDBOOK 1.0',48,self.h-24,7.5,'Medium','#B1C3E2' if self.dark else MUTED)
            self.text(f'{self.n:02}',self.w-65,self.h-25,9,'Bold',SKY if self.dark else NAVY)
        self.c.showPage()
    def save(self):self.c.save()
    def card(self,x,y,w,h,title,body,fill=BG,number=None):
        self.rect(x,y,w,h,fill,r=12)
        yy=y+23
        if number:self.text(number,x+22,yy,10,'Bold',LINK);yy+=26
        self.text(title,x+22,yy,20,'Display',NAVY,maxw=w-44,leading=23)
        self.text(body,x+22,yy+40,11.5,'Body',MUTED,maxw=w-44,leading=17)

def icon(b,kind,x,y,s=24,color=MUTED,lw=1.7):
    c=b.c;c.saveState();c.setStrokeColor(HexColor(color));c.setLineWidth(lw);c.setLineCap(1);c.setLineJoin(1)
    def l(a,d):c.line(x+a[0]*s/24,b.h-y-a[1]*s/24,x+d[0]*s/24,b.h-y-d[1]*s/24)
    def rr(a,bb,ww,hh,r=2):c.roundRect(x+a*s/24,b.h-y-(bb+hh)*s/24,ww*s/24,hh*s/24,r*s/24,fill=0,stroke=1)
    if kind=='home':
        for a,d in [((3,11),(12,3)),((12,3),(21,11)),((5,10),(5,21)),((5,21),(19,21)),((19,21),(19,10)),((10,21),(10,14)),((10,14),(14,14)),((14,14),(14,21))]:l(a,d)
    elif kind=='box':
        for a,d in [((3,7),(12,3)),((12,3),(21,7)),((21,7),(21,18)),((21,18),(12,22)),((12,22),(3,18)),((3,18),(3,7)),((3,7),(12,11)),((12,11),(21,7)),((12,11),(12,22)),((7,5),(16,9))]:l(a,d)
    elif kind=='search':
        c.circle(x+10*s/24,b.h-y-10*s/24,6*s/24,fill=0,stroke=1);l((15,15),(21,21))
    elif kind=='chart':
        for a,d in [((4,4),(4,21)),((4,21),(22,21)),((8,17),(8,12)),((13,17),(13,7)),((18,17),(18,3))]:l(a,d)
    elif kind=='doc':
        rr(5,2,14,20);l((9,9),(15,9));l((9,13),(15,13));l((9,17),(13,17))
    elif kind=='check':l((4,12),(10,18));l((10,18),(21,6))
    elif kind=='arrow':l((3,12),(21,12));l((16,7),(21,12));l((16,17),(21,12))
    elif kind=='plus':l((12,4),(12,20));l((4,12),(20,12))
    elif kind=='bell':
        p=c.beginPath();p.moveTo(x+5*s/24,b.h-y-17*s/24);p.lineTo(x+6*s/24,b.h-y-9*s/24);p.curveTo(x+7*s/24,b.h-y-2*s/24,x+17*s/24,b.h-y-2*s/24,x+18*s/24,b.h-y-9*s/24);p.lineTo(x+19*s/24,b.h-y-17*s/24);p.close();c.drawPath(p);l((10,21),(14,21))
    else:
        c.circle(x+12*s/24,b.h-y-12*s/24,9*s/24,stroke=1,fill=0);l((12,7),(12,13));l((12,17),(12,17.2))
    c.restoreState()

def web(b,x,y,w,h,marketing=False,dark=False):
    """Editable vector brand application, no live behavior."""
    c=b.c;c.saveState();c.translate(x,b.h-y);sc=w/1120;c.scale(sc,sc)
    v=Book.__new__(Book);v.c=c;v.w=1120;v.h=0
    hh=h/sc
    # local top-origin through h=0
    v.rect(0,0,1120,hh,'#0F1D34' if dark else BG,r=12)
    v.rect(0,0,1120,34,WHITE if not dark else '#1A2D49',r=12)
    for xx,co in [(16,'#CBD4E3'),(30,'#CBD4E3'),(44,'#CBD4E3')]:
        c.setFillColor(HexColor(co));c.circle(xx,-17,3,fill=1,stroke=0)
    v.text('FreteNow / aplicação de marca',420,12,9,'Medium',MUTED if not dark else SKY)
    if marketing:
        v.rect(0,34,1120,hh-34,'#0A0A0A')
        v.logo(46,65,178,'white')
        v.text('Soluções',560,78,12,'Medium','#D4D4D4');v.text('Como funciona',658,78,12,'Medium','#D4D4D4')
        v.rect(900,63,174,38,WHITE,r=8);v.text('Acessar plataforma',922,75,12,'Bold','#111111')
        v.text('SEU FRETE EM MOVIMENTO',49,160,10,'Bold','#A3A3A3')
        v.text('Informação clara.\nDecisões melhores.',47,209,53,'DisplayBold',WHITE,maxw=1000,leading=57)
        v.text('Uma identidade que dá espaço ao que importa.\nMais contexto para entender cada etapa.',50,353,16,'Body','#D4D4D4',maxw=650)
        v.rect(50,419,187,40,WHITE,r=7);v.text('Conheça a FreteNow',69,432,14,'Bold','#111111')
        v.rect(814,345,254,103,'#171717','#4A4A4A',r=10)
        v.text('A operação começa\ncom informação.',834,363,20,'Display',WHITE,leading=24)
        v.line(834,418,1047,418,'#7A7A7A',.6)
        v.text('Identidade FreteNow',834,430,10,'Medium','#D4D4D4')
    else:
        v.rect(0,34,198,hh-34,NAVY)
        v.logo(23,64,150,'reverse')
        items=[('home','Visão geral'),('plus','Cotação'),('box','Embarques'),('search','Rastreamento'),('chart','Analytics'),('doc','Documentos')]
        for i,(kind,label) in enumerate(items):
            yy=135+i*45
            if i==0:v.rect(13,yy-8,172,36,'#203A66',r=7)
            icon(v,kind,26,yy,18,WHITE if i==0 else '#B9CBE8',1.3)
            v.text(label,56,yy+2,12,'Bold' if i==0 else 'Body',WHITE if i==0 else '#B9CBE8')
        v.rect(198,34,922,62,WHITE if not dark else '#182A44')
        v.text('Sua operação',231,57,13,'Bold',NAVY if not dark else WHITE)
        v.text('AMBIENTE ILUSTRATIVO',904,58,9,'Bold',LINK if not dark else SKY)
        v.text('Visão geral',232,124,30,'Display',NAVY if not dark else WHITE)
        v.text('Acompanhe o que precisa da sua atenção.',233,165,12,'Body',MUTED if not dark else '#B9CBE8')
        v.rect(906,127,175,39,ACTION if not dark else SKY,r=8)
        icon(v,'plus',920,137,17,WHITE if not dark else NAVY,1.5)
        v.text('Nova cotação',947,140,12,'Bold',WHITE if not dark else NAVY)
        compact=hh<600
        for i,(num,label) in enumerate([('18','Embarques no período'),('12','Em andamento'),('06','Concluídos')]):
            xx=233+i*287;v.rect(xx,210,270,80 if compact else 103,WHITE if not dark else '#182A44',r=10)
            v.text(label,xx+19,229,11,'Medium',MUTED if not dark else '#B9CBE8')
            v.text(num,xx+19,254,34,'Display',NAVY if not dark else WHITE)
        v.rect(233,303 if compact else 338,848,hh-(343 if compact else 393),WHITE if not dark else '#182A44',r=10)
        v.text('Embarques recentes',253,321 if compact else 358,18,'Display',NAVY if not dark else WHITE)
        for i,label in enumerate(['Referência','Origem / destino','Situação','Atualização']):v.text(label,[253,423,763,938][i],350 if compact else 400,10,'Bold',MUTED if not dark else '#B9CBE8')
        for i,(ref,route,status) in enumerate([('FN-018','Origem A → Destino B','Em trânsito'),('FN-017','Origem C → Destino D','Aguardando coleta'),('FN-016','Origem E → Destino F','Concluído')]):
            yy=(378+i*32) if compact else (432+i*43)
            if yy+(20 if compact else 31)>hh-(40 if compact else 36):break
            v.line(253,yy-9,1060,yy-9,LINE if not dark else '#314561',.6)
            v.text(ref,253,yy,11,'Bold',NAVY if not dark else WHITE);v.text(route,423,yy,11,'Body',INK if not dark else WHITE)
            v.tag(status,761,yy-5,'#E8F2FF' if i<2 else '#E7F6EC',LINK if i<2 else GREEN)
            v.text('Hoje',938,yy,11,'Body',MUTED if not dark else '#B9CBE8')
        v.text('Exemplo visual com dados fictícios.',233,hh-29,10,'Body',MUTED if not dark else '#B9CBE8')
    c.restoreState()

def phone(b,x,y,w=220,platform='ios',dark=False,detail=False):
    c=b.c;c.saveState();c.translate(x,b.h-y);sc=w/260;c.scale(sc,sc)
    v=Book.__new__(Book);v.c=c;v.w=260;v.h=0
    surface='#152642' if dark else WHITE;bg='#0E1B30' if dark else BG;fg=WHITE if dark else NAVY;mut='#B9CBE8' if dark else MUTED
    v.rect(0,0,260,520,'#152033',r=35);v.rect(7,7,246,506,bg,r=29)
    if platform=='ios':
        v.rect(95,16,70,17,'#152033',r=9);v.text('9:41',22,19,9,'Bold',fg)
    else:
        v.text('9:41',21,20,9,'Bold',fg);c.setFillColor(HexColor('#152033'));c.circle(130,-23,4,fill=1,stroke=0)
    v.text('•••',214,18,8,'Bold',fg)
    v.logo(24,60,129,'reverse' if dark else 'color');icon(v,'bell',216,64,17,mut,1.2)
    v.text('Embarque' if detail else 'Sua operação',22,112,23,'Display',fg,maxw=220,leading=25)
    v.text('FN-018 / exemplo ilustrativo' if detail else 'Exemplo com dados fictícios',23,147,10,'Body',mut)
    if detail:
        v.rect(20,179,220,109,surface,r=14)
        v.tag('Em trânsito',34,195,'#E8F2FF',LINK)
        v.text('Origem A',35,231,13,'Bold',fg);v.text('Destino B',35,255,13,'Bold',fg)
        icon(v,'arrow',198,239,20,SKY if dark else LINK)
        v.rect(20,306,220,115,surface,r=14);v.text('Acompanhamento',35,322,15,'Display',fg)
        for i,tx in enumerate(['Coleta registrada','Em trânsito','Próxima atualização']):
            yy=355+i*22
            c.setFillColor(HexColor((SKY if dark else ACTION) if i<2 else LINE));c.circle(39,-(yy+5),3,fill=1,stroke=0)
            v.text(tx,51,yy,11,'Medium' if i==1 else 'Body',fg if i==1 else mut)
    else:
        v.rect(20,178,220,90,surface,r=14)
        v.text('Em andamento',35,194,11,'Medium',mut);v.text('12',35,218,30,'Display',fg)
        v.mark(181,204,35,'reverse' if dark else 'color')
        v.rect(20,283,220,45,SKY if dark else ACTION,r=10 if platform=='ios' else 22)
        icon(v,'plus',52,297,16,NAVY if dark else WHITE,1.5);v.text('Nova cotação',79,299,12,'Bold',NAVY if dark else WHITE)
        v.text('Embarques recentes',23,350,16,'Display',fg)
        for i,status in enumerate(['Em trânsito','Aguardando coleta']):
            yy=382+i*47;v.rect(20,yy,220,40,surface,r=9);icon(v,'box',31,yy+10,18,LINK if not dark else SKY,1.2)
            v.text(f'FN-0{18-i}',59,yy+8,11,'Bold',fg);v.text(status,59,yy+23,9,'Body',mut)
    v.rect(8,455,244,50,surface,r=12)
    for i,(kind,label) in enumerate([('home','Início'),('box','Embarques'),('search','Buscar'),('doc','Docs')]):
        xx=30+i*61
        if platform=='android' and i==0:v.rect(xx-8,460,34,22,'#284C74' if dark else '#D7E9FF',r=11)
        icon(v,kind,xx,463,17,SKY if dark and i==0 else LINK if i==0 else mut,1.25)
        v.text(label,xx-3,486,7,'Bold' if i==0 else 'Body',fg if i==0 else mut)
    v.rect(96,505,68,3,'#AAB5C7',r=1.5)
    c.restoreState()

def listlines(b,items,x,y,w,size=12,color=MUTED,step=0):
    for t in items:
        b.rect(x,y+5,4,4,BLUE,r=1)
        end=b.text(t,x+17,y,size,'Body',color,maxw=w-17,leading=size*1.45)
        y=end+(step or 14)
    return y

def build():
    b=Book(OUT/'FreteNow-Brandbook-v1.0.pdf')
    # 01
    b.start('Capa',dark=True,key='cover')
    b.text('IDENTIDADE EM MOVIMENTO',50,45,10,'Bold',SKY)
    b.logo(50,155,690,'reverse')
    b.text('Clareza para\nmover.',50,310,57,'Display',WHITE,leading=59)
    b.text('Brandbook\nIdentidade, voz e aplicações digitais',610,385,16,'Medium','#C9D8F0',leading=24)
    b.text('VERSÃO 1.0 / OUTUBRO 2026',610,489,10,'Bold',SKY)
    b.end()
    # 02
    b.start('Guia de leitura','Uma marca. Muitas aplicações.','O mesmo reconhecimento, com o cuidado que cada contexto exige.',key='guide')
    sections=[('01','Essência e posicionamento','03-05','essence'),('02','Sistema visual','06-16','logo'),('03','Comunicação','17-18','voice'),('04','Aplicações','19-28','web'),('05','Operação da marca','29-32','governance')]
    for i,(num,title,pages,key) in enumerate(sections):
        yy=172+i*65;b.text(num,50,yy,17,'Display',LINK);b.text(title,102,yy,21,'Display',NAVY);b.text(pages,821,yy+4,11,'Medium',MUTED);b.line(101,yy+42,910,yy+42)
        b.c.linkAbsolute(title,key,Rect=(48,H-yy-42,912,H-yy+5),thickness=0)
    b.text('Logo aprovado por Leo. As regras, mensagens e aplicações desta edição consolidam a direção em um sistema utilizável.',50,512,10,'Body',MUTED,maxw=850)
    b.end()
    # 03
    b.start('01 / Essência','Clareza para mover.','Assinatura editorial proposta para esta edição. O logo funciona sem assinatura.',key='essence')
    b.text('Transformar complexidade\nem próximos passos claros.',50,178,38,'Display',NAVY,maxw=750,leading=44)
    b.text('A FreteNow se apresenta como uma marca de tecnologia para a gestão de fretes: organizada, acessível e atenta a quem precisa decidir e acompanhar uma operação.',52,302,16,'Body',MUTED,maxw=730,leading=23)
    for i,(title,body) in enumerate([('Confiança','Informação precisa. Limites claros. Expectativas honestas.'),('Clareza','Hierarquia visível e linguagem que ajuda a agir.'),('Controle','Contexto e continuidade em cada etapa da experiência.')]):
        b.card(50+i*294,408,278,112,title,body,number=None)
    b.end()
    # 04
    b.start('01 / Posicionamento','Profissional sem criar distância.','Diretriz de posicionamento: orientar a forma como a marca se apresenta, sem prometer recursos já disponíveis.')
    b.rect(50,170,860,112,NAVY,r=12)
    b.text('Para quem precisa organizar, contratar e acompanhar fretes, a FreteNow busca tornar a operação mais compreensível, com informação bem apresentada e orientação direta.',75,194,21,'Display',WHITE,maxw=805,leading=28)
    for i,(title,body) in enumerate([('Quem opera','Equipes de logística que precisam localizar informações e reconhecer o próximo passo.'),('Quem decide','Gestores que precisam entender o contexto da operação, sem ruído visual ou promessas vagas.'),('Quem acompanha','Pessoas autorizadas a consultar documentos e atualizações, com linguagem compreensível.')]):
        b.card(50+i*294,304,278,191,title,body,number=f'0{i+1}')
    b.text('Públicos de referência editorial. Segmentação comercial e serviços efetivos dependem da estratégia e da implementação.',52,510,10,'Body',MUTED,maxw=840)
    b.end()
    # 05
    b.start('01 / Personalidade','Como a marca se comporta.','Uma identidade se reconhece no que diz, no que mostra e no que escolhe simplificar.')
    principles=[('Confiante','Apresenta fatos e consequências. Explica limites e não transforma estimativas em garantias.'),('Clara','Prioriza uma ação por contexto. Nomeia estados e informa o que a pessoa pode fazer.'),('Ágil','Encurta o caminho e a frase. Não usa urgência artificial para acelerar uma decisão.'),('Próxima','Fala com respeito e naturalidade. Ajuda a resolver sem infantilizar ou culpar quem usa.')]
    for i,(a,d) in enumerate(principles):b.card(50+(i%2)*438,170+(i//2)*178,422,162,a,d,number=None)
    b.end()
    # 06
    b.start('02 / Logo','O ponto de reconhecimento.','Caixa geométrica com leitura de F. Frete em azul-marinho; Now em azul vivo.',key='logo')
    b.rect(50,172,860,246,BG,r=16);b.logo(117,250,726)
    b.text('Símbolo',80,455,15,'Display',NAVY);b.text('A caixa conecta a marca ao universo logístico; os vazios preservam leveza e leitura.',80,484,11.5,'Body',MUTED,maxw=350)
    b.text('Escrita proprietária',502,455,15,'Display',NAVY);b.text('Usar os contornos fornecidos. As fontes do sistema visual não substituem o desenho do wordmark.',502,484,11.5,'Body',MUTED,maxw=350)
    b.end()
    # 07
    b.start('02 / Construção e proteção','Espaço para a marca respirar.','Regras de aplicação da v1.0. Sempre escalar o conjunto proporcionalmente.')
    b.rect(93,195,754,225,BG,r=10)
    lh=b.logo(148,258,640)
    xunit=lh/4
    for xx in (148-xunit,148+640+xunit):b.line(xx,258-xunit,xx,258+lh+xunit,SKY,.8)
    for yy in (258-xunit,258+lh+xunit):b.line(148-xunit,yy,148+640+xunit,yy,SKY,.8)
    b.text('x',121,264,11,'Bold',LINK);b.text('x = 1/4 da altura total do símbolo',123,217,11,'Medium',LINK)
    for i,(a,d) in enumerate([('Logo horizontal','156 px no digital / 28 mm em impressão'),('Símbolo isolado','24 px no digital / 6 mm em impressão'),('Favicon','16 px apenas como exceção técnica; conferir a leitura no navegador')]):
        xx=52+i*294;b.text(a,xx,456,15,'Display',NAVY);b.text(d,xx,486,11,'Body',MUTED,maxw=270)
    b.end()
    # 08
    b.start('02 / Variações','A versão certa para cada fundo.','Priorizar a assinatura horizontal colorida em superfícies claras.')
    variants=[(50,174,WHITE,'color','01 / Colorida principal'),(488,174,NAVY,'reverse','02 / Reversa cromática'),(50,346,BG,'navy','03 / Monocromática marinho'),(488,346,NAVY,'white','04 / Monocromática branca')]
    for x,y,col,var,label in variants:
        b.rect(x,y,422,151,col,LINE if col==WHITE else None,r=12);b.logo(x+45,y+44,332,var);b.text(label,x+20,y+122,9,'Medium',SKY if col==NAVY else MUTED)
    b.end()
    # 09
    b.start('02 / Integridade','Reconhecível em toda situação.','Não alterar o desenho, o espaço entre elementos nem a relação entre as cores.')
    labels=['Não esticar ou comprimir','Não inclinar a assinatura','Não mudar a ordem dos elementos','Não usar em área visualmente ruidosa','Não criar sombras ou efeitos','Não substituir a escrita por texto digitado']
    for i,label in enumerate(labels):
        xx=50+(i%3)*294;yy=170+(i//3)*172;b.rect(xx,yy,278,153,BG,r=10)
        b.c.saveState()
        if i==0:
            cx,cy=xx+139,H-(yy+65);b.c.translate(cx,cy);b.c.scale(1,.5);b.c.translate(-cx,-cy);b.logo(xx+28,yy+43,220)
        elif i==1:
            cx,cy=xx+139,H-(yy+65);b.c.translate(cx,cy);b.c.rotate(13);b.c.translate(-cx,-cy);b.logo(xx+31,yy+43,215)
        elif i==2:
            b.logo(xx+26,yy+48,205);b.mark(xx+224,yy+51,29)
        elif i==3:
            for j in range(10):b.line(xx+10,yy+12+j*9,xx+268,yy+85-j*3,SKY,3)
            b.logo(xx+26,yy+43,225)
        elif i==4:
            b.logo(xx+32,yy+50,222,'navy');b.logo(xx+26,yy+43,222)
        else:b.text('FreteNow',xx+34,yy+48,35,'Body',NAVY)
        b.c.restoreState()
        b.rect(xx+14,yy+116,5,5,RED,r=1);b.text(label,xx+26,yy+111,10,'Medium',MUTED,maxw=237)
    b.end()
    # 10
    b.start('02 / Paleta','Azuis que organizam o movimento.','Cor de marca, cor de ação e cor de apoio têm funções diferentes.')
    cols=[('Marinho',NAVY,'Base institucional e hierarquia'),('Azul vivo',BLUE,'Assinatura e reconhecimento'),('Azul-claro',SKY,'Apoio, detalhe e contraste no escuro')]
    for i,(name,hexv,role) in enumerate(cols):
        xx=50+i*294;b.rect(xx,170,278,222,hexv,r=12)
        fg=NAVY if i==2 else WHITE;b.text(name,xx+23,195,24,'Display',fg);b.text(hexv,xx+23,330,19,'Medium',fg)
        vals=[round(v*255) for v in rgb(hexv)];mx=max(rgb(hexv));k=1-mx;cmy=[(1-v-k)/(1-k) if k<1 else 0 for v in rgb(hexv)]
        b.text('RGB '+' / '.join(map(str,vals)),xx,414,11,'Medium',NAVY)
        b.text('CMYK ref. '+' / '.join(str(round(v*100)) for v in cmy+[k]),xx,438,10,'Body',MUTED)
        b.text(role,xx,468,12,'Body',MUTED,maxw=270)
    b.text('CMYK é uma conversão aritmética de referência. A gráfica deve ajustar o perfil de saída e conferir prova física.',51,522,9,'Body',MUTED,maxw=850)
    b.end()
    # 11
    b.start('02 / Cor funcional','Cor que ajuda a agir.','O azul de ação é mais escuro para sustentar rótulos brancos legíveis.')
    pairs=[('Ação primária',ACTION,WHITE),('Link de texto',WHITE,LINK),('Sucesso','#E7F6EC',GREEN),('Atenção','#FDF3E1',AMBER),('Erro','#FDEEEE',RED)]
    for i,(name,fill,fg) in enumerate(pairs):
        yy=176+i*62;b.rect(50,yy,205,44,fill,LINE if fill==WHITE else None,r=8);b.text(name,66,yy+14,13,'Bold',fg)
        b.text(f'{fg} sobre {fill}',290,yy+8,12,'Medium',NAVY);b.text(f'{contrast(fg,fill):.2f}:1 de contraste'.replace('.',','),290,yy+27,10,'Body',MUTED)
    b.rect(600,176,310,288,BG,r=12)
    b.text('Usar com intenção',622,200,22,'Display',NAVY)
    listlines(b,['Azul vivo (#0177FD) não recebe texto branco de corpo: contraste de 4,15:1.','Para botões: #0166D9 + branco, 5,38:1.','Sinalizar estados com texto e ícone; nunca depender apenas da cor.','Texto normal ≥ 4,5:1; texto grande e elementos essenciais de UI ≥ 3:1.'],622,244,264,11)
    b.text('Critérios de referência: WCAG 2.2 AA. Conferir cada combinação efetivamente usada, inclusive estados e fundos.',51,516,9.5,'Body',MUTED,maxw=850)
    b.end()
    # 12
    b.start('02 / Tipografia','Expressão nos títulos. Clareza no uso.','Duas famílias abertas, com funções complementares.')
    b.text('Bricolage\nGrotesque',50,175,51,'DisplayBold',NAVY,leading=55)
    b.text('Títulos, chamadas, números de destaque.\nPesos 600-750; largura normal.',53,309,13,'Body',MUTED,leading=20)
    b.text('Aa Bb Cc 0123',52,388,27,'Display',LINK)
    b.rect(478,174,432,326,BG,r=14)
    b.text('Instrument Sans',502,200,31,'Bold',NAVY)
    b.text('A informação deve ser simples de encontrar e confortável de ler.',504,259,22,'Body',INK,maxw=370,leading=30)
    b.text('Textos, formulários, navegação e tabelas.\n400 para leitura, 550 para ênfase e 700 para ação.',504,380,13,'Body',MUTED,maxw=370,leading=20)
    b.text('ã ç é Ê / + − 0 1 2 3 4 5 6 7 8 9',504,455,17,'Medium',LINK)
    b.end()
    # 13
    b.start('02 / Escala tipográfica','Hierarquia sem esforço.','Valores iniciais para design. Escalar com conteúdo, tamanho de tela e preferências de acessibilidade.')
    rows=[('Display','Bricolage 650','48 / 54','32 / 38'),('Título de página','Bricolage 650','32 / 38','28 / 34'),('Título de seção','Instrument 700','22 / 28','22 / 28'),('Texto principal','Instrument 400','16 / 24','17 pt iOS / 16 sp Android'),('Rótulo e ação','Instrument 550-700','14 / 20','17 pt iOS / 14 sp Android'),('Legenda','Instrument 400','12 / 18','13 pt iOS / 12 sp Android')]
    for i,tx in enumerate(['Papel','Família / peso','Web px / entrelinha','Mobile / referência']):b.text(tx,[52,265,494,699][i],179,10,'Bold',LINK)
    for j,row in enumerate(rows):
        yy=211+j*43;b.line(50,yy-10,910,yy-10)
        for i,tx in enumerate(row):b.text(tx,[52,265,494,699][i],yy,11,'Medium' if i==0 else 'Body',NAVY if i==0 else MUTED,maxw=[195,205,190,210][i])
    b.rect(50,489,860,47,BG,r=9);b.text('Mobile: preservar Dynamic Type no iOS e escala de fonte no Android. Texto funcional pode usar a fonte do sistema.',67,505,11,'Medium',NAVY,maxw=828)
    b.end()
    # 14
    b.start('02 / Layout','A informação precisa de espaço.','Organizar pela tarefa, com agrupamento, alinhamento e respiro consistentes.')
    for i in range(12):b.rect(50+i*72,181,62,114,'#E8F1FF',r=3)
    b.text('Web / 12 colunas',50,317,20,'Display',NAVY);b.text('Base de 1440 px. Margens de 40 px; gap de 24 px. Conteúdo até 1280 px; coluna lateral pode ficar fora da grade.',50,350,12,'Body',MUTED,maxw=405)
    b.text('Mobile / 4 colunas',501,317,20,'Display',NAVY);b.text('Margens de 16-24 pt/dp. Respeitar áreas seguras, teclado e barras do sistema. Não reduzir tudo para caber.',501,350,12,'Body',MUTED,maxw=405)
    for i,s in enumerate([4,8,12,16,24,32,48,64]):
        xx=52+i*105;b.rect(xx,459,s,8,BLUE,r=2);b.text(str(s),xx,485,12,'Medium',NAVY)
    b.text('Escala de espaço / base 4',52,425,11,'Bold',LINK)
    b.end()
    # 15
    b.start('02 / Iconografia','Sinais simples. Leitura rápida.','Contorno uniforme, cantos suaves e uma metáfora clara por ação.')
    names=[('home','Início'),('box','Embarques'),('search','Busca'),('chart','Analytics'),('doc','Documentos'),('bell','Avisos'),('plus','Adicionar'),('check','Concluído')]
    for i,(kind,name) in enumerate(names):
        xx=50+(i%4)*220;yy=178+(i//4)*139;b.rect(xx,yy,200,114,BG,r=12);icon(b,kind,xx+80,yy+20,40,LINK,2);b.text(name,xx+20,yy+82,12,'Medium',NAVY)
    b.text('Grade de 24 unidades / traço 1,75-2 / área óptica consistente',52,478,13,'Bold',NAVY)
    b.text('Manter rótulos nas navegações principais. Reservar o símbolo da marca para identificação; não o transformar em ícone de função.',52,508,11,'Body',MUTED,maxw=845)
    b.end()
    # 16
    b.start('02 / Linguagem visual','Estrutura, luz e movimento.','O universo visual apoia o conteúdo sem competir com ele.')
    b.rect(50,175,412,216,NAVY,r=12);b.mark(163,206,168,'reverse')
    b.text('Geometria de apoio',50,413,20,'Display',NAVY);b.text('Planos da caixa e diagonais suaves podem formar recortes e detalhes. Evitar repetição que prejudique a leitura.',50,449,12,'Body',MUTED,maxw=397)
    b.rect(492,175,418,216,BG,r=12)
    listlines(b,['Fotografia: operação real, luz natural e composição organizada.','Pessoas e equipamentos em contextos plausíveis, com permissão de uso.','Ilustração: volumes simples, poucas cores e relação clara com a tarefa.','Evitar caminhões genéricos em excesso, velocidade artificial e bancos de imagens com marcas de terceiros.'],515,198,367,12)
    b.text('Fotografia e ilustração',492,413,20,'Display',NAVY);b.text('Estes critérios orientam a seleção futura de imagens. A edição atual privilegia aplicações em vetor e tipografia.',492,449,12,'Body',MUTED,maxw=405)
    b.end()
    # 17
    b.start('03 / Voz','Direta. Calma. Útil.','Falar com quem está trabalhando, respeitando seu tempo e sua capacidade de decidir.',key='voice')
    pairs=[('Efetue a realização da cotação.','Faça uma cotação.'),('Ocorreu um erro inesperado.','Não foi possível carregar as tarifas. Tente novamente.'),('Endereço inválido!','Confira o número e o CEP do endereço.'),('Seu frete chegará sem atrasos.','Consulte a previsão informada para este embarque.'),('Falha do usuário no preenchimento.','Revise os campos destacados para continuar.'),('Sucesso! Tudo perfeito!','Alterações salvas.'),('Clique no botão abaixo.','Consulte os detalhes do embarque.'),('Última chance de contratar!','Confira as condições e a validade antes de confirmar.')]
    b.text('EVITAR',52,176,10,'Bold',MUTED);b.text('PREFERIR',485,176,10,'Bold',LINK)
    for i,(a,d) in enumerate(pairs):
        yy=207+i*40;b.line(50,yy-9,910,yy-9);b.text(a,52,yy,11,'Body',MUTED,maxw=398,leading=14);b.text(d,485,yy,11,'Medium',NAVY,maxw=417,leading=14)
    b.end()
    # 18
    b.start('03 / Microtexto','Explicar o estado. Indicar o caminho.','Informar o que aconteceu, por que importa e qual é a próxima ação possível.')
    texts=[('Vazio','Nenhum embarque por aqui.','Quando houver embarques, eles aparecerão nesta lista.','Fazer cotação'),('Falha','Não foi possível carregar.','Confira a conexão e tente novamente.','Tentar novamente'),('Sessão','Sua sessão expirou.','Entre novamente para continuar com segurança.','Entrar'),('Confirmação','Revise antes de confirmar.','Confira os dados e as condições apresentados.','Revisar dados')]
    for i,(label,title,body,cta) in enumerate(texts):
        xx=50+(i%2)*438;yy=174+(i//2)*173;b.rect(xx,yy,422,158,BG,r=12);b.text(label.upper(),xx+20,yy+16,9,'Bold',LINK);b.text(title,xx+20,yy+42,21,'Display',NAVY,maxw=380);b.text(body,xx+20,yy+75,11,'Body',MUTED,maxw=380);b.text(cta,xx+20,yy+123,11,'Bold',LINK)
    b.text('Escrever sempre FreteNow: uma palavra, com F e N maiúsculos. Não separar, abreviar nem mudar a capitalização.',52,530,10,'Medium',NAVY,maxw=850)
    b.end()
    # 19
    b.start('04 / Web','A marca organiza a operação.','Aplicação visual em desktop. Conteúdo e números são fictícios; não representa um aplicativo implementado.',key='web')
    web(b,50,159,860,365)
    b.end()
    # 20
    b.start('04 / Web institucional','O site tem sua própria expressão.','Referência pública distinta do portal: base escura, contraste monocromático e tipografia editorial ampla.')
    web(b,50,159,860,365,marketing=True)
    b.end()
    # 21
    b.start('04 / iOS','Familiar ao iPhone. Próprio da FreteNow.','Aplicação visual de referência. A identidade convive com os padrões nativos de navegação e acessibilidade.')
    phone(b,91,153,189,'ios')
    b.text('Preservar a experiência do sistema',382,181,27,'Display',NAVY,maxw=480,leading=32)
    listlines(b,['Usar áreas seguras e manter o conteúdo livre das barras do sistema.','Texto funcional acompanha Dynamic Type; o layout cresce em vez de cortar informação.','Alvos de toque com pelo menos 44 × 44 pt como referência de projeto.','Marca em títulos e aberturas; controles seguem a hierarquia do iOS.','Tab bar para destinos estáveis. Nomear ações claramente; respeitar gestos e navegação de retorno.'],383,270,481,12)
    b.end()
    # 22
    b.start('04 / iOS em contexto','Clareza no detalhe. Conforto no escuro.','O conteúdo mantém sua prioridade ao mudar de tela ou de aparência.')
    phone(b,83,160,181,'ios',detail=True);phone(b,331,160,181,'ios',dark=True,detail=True)
    b.text('Mesma estrutura,\nmesmo significado.',603,198,29,'Display',NAVY,leading=34)
    listlines(b,['Linha do tempo com texto e marcadores.','Documentos e ações no contexto do embarque.','Contraste revisado para a aparência escura.','Não recriar superfícies e efeitos do sistema dentro do arquivo do logo.'],604,300,283,12)
    b.end()
    # 23
    b.start('04 / Android','Identidade consistente. Padrões Android.','Aplicação visual orientada à navegação e à escala de conteúdo da plataforma.')
    phone(b,92,153,189,'android')
    b.text('Leitura e toque com espaço',382,184,28,'Display',NAVY,maxw=490)
    listlines(b,['Alvos de toque de pelo menos 48 × 48 dp; espaçamento evita acionamentos por engano.','Texto em sp respeita a escala definida pela pessoa. Evitar alturas fixas em blocos de texto.','Navigation bar com rótulos e indicação de seleção. Voltar e gestos respeitam o sistema.','A cor de marca ancora a identidade; superfícies, estados e controles mantêm contraste.','Ícone adaptativo é composto por camadas. O símbolo precisa sobreviver às máscaras dos launchers.'],383,254,484,12)
    b.end()
    # 24
    b.start('04 / Android em contexto','Mesmo serviço, outra forma de tocar.','Os componentes podem mudar entre plataformas; o reconhecimento e a linguagem permanecem.')
    phone(b,83,160,181,'android',detail=True);phone(b,331,160,181,'android',dark=True)
    b.text('Evitar uma cópia\nreduzida do desktop.',603,198,29,'Display',NAVY,leading=34)
    listlines(b,['Priorizar a tarefa do momento.','Trocar tabelas largas por itens legíveis quando necessário.','Oferecer descrição acessível para ícones de ação.','Não esconder estados ou informações essenciais para fazer a tela caber.'],604,300,283,12)
    b.end()
    # 25
    b.start('04 / Ícones de aplicativo','Reconhecível antes de abrir.','Símbolo isolado, sem wordmark ou assinatura. As máscaras pertencem ao sistema.')
    b.rect(52,174,278,278,NAVY,r=0);b.mark(113,236,155,'reverse')
    b.text('Matriz quadrada / 1024 px',52,474,14,'Bold',NAVY);b.text('Fundo opaco. Não incorporar cantos ou sombra externos.',52,501,11,'Body',MUTED,maxw=290)
    for i,(title,desc) in enumerate([('iOS','PNG 1024 × 1024 para catálogo de assets; camadas SVG para preparar no Icon Composer.'),('Android','Canvas de 108 × 108 dp. Preservar a marca na zona central de 66 × 66 dp.'),('Google Play','PNG32 sRGB 512 × 512; até 1024 KB. Arquivo quadrado sem máscara externa.')]):
        yy=178+i*109;b.text(title,388,yy,21,'Display',NAVY);b.text(desc,388,yy+35,12,'Body',MUTED,maxw=500,leading=18)
    b.text('Os arquivos são matrizes de marca. A configuração de assets, camadas e empacotamento nativo ocorrerá na implementação.',52,538,9,'Body',MUTED,maxw=850)
    b.end()
    # 26
    b.start('04 / Aparência escura','A mesma marca, com luz diferente.','Extensão cromática da v1.0. Manter a hierarquia de conteúdo e a indicação de estado.',dark=True)
    phone(b,74,163,177,'android',dark=True)
    darktokens=[('Fundo','#0E1B30'),('Superfície','#152642'),('Texto principal','#FFFFFF'),('Texto secundário','#B9CBE8'),('Ação / foco','#7DB8FF'),('Texto sobre ação','#0A1F4E')]
    for i,(name,col) in enumerate(darktokens):
        xx=369+(i%2)*271;yy=190+(i//2)*95;b.rect(xx,yy,38,38,col,'#486082' if col in ('#0E1B30','#152642') else None,r=8);b.text(name,xx+52,yy+3,12,'Bold',WHITE);b.text(col,xx+52,yy+24,11,'Body','#B9CBE8')
    b.text('Azul-claro sobre marinho: 7,71:1. Não inverter o logo por filtro: utilizar a versão reversa fornecida.',371,488,12,'Body','#C9D8F0',maxw=500)
    b.end()
    # 27
    b.start('04 / Documentos e e-mail','A identidade continua fora da tela.','Exemplos editoriais com campos genéricos. Preencher apenas com dados e condições verificados.')
    b.rect(73,166,285,368,BG,r=8);b.rect(86,178,259,344,WHITE,LINE)
    b.logo(106,205,139);b.text('Proposta comercial',106,263,19,'Display',NAVY,maxw=215)
    b.text('Empresa / destinatário\nData / referência',107,302,10,'Body',MUTED,leading=17)
    for i in range(5):b.line(107,359+i*18,318 if i%2==0 else 281,359+i*18,LINE,1)
    b.rect(106,467,218,26,NAVY,r=4);b.text('Condições e escopo verificados',118,476,9,'Medium',WHITE)
    b.rect(407,180,481,300,BG,r=12);b.rect(423,195,449,269,WHITE,r=8);b.logo(448,218,167)
    b.text('Olá, [nome].',449,285,23,'Display',NAVY)
    b.text('Você pode consultar os detalhes desta solicitação no ambiente autorizado da FreteNow.',449,330,13,'Body',MUTED,maxw=388,leading=19)
    b.rect(449,395,176,39,ACTION,r=7);b.text('Consultar detalhes',467,408,12,'Bold',WHITE)
    b.text('Assinatura: nome / função / canal oficial verificado.',411,506,11,'Body',MUTED,maxw=470)
    b.end()
    # 28
    b.start('04 / Conteúdo e apresentações','O conteúdo é a mensagem.','Aplicações de marca sem ofertas, certificações ou resultados comerciais inventados.')
    b.rect(50,171,332,332,NAVY);b.mark(81,200,52,'white');b.text('Seu frete,\ncom mais\nclareza.',82,283,40,'Display',WHITE,leading=43);b.logo(82,451,190,'reverse')
    b.rect(423,171,487,274,BG,r=10);b.logo(449,198,177);b.text('Informação clara.\nPróximos passos\nbem definidos.',449,264,33,'Display',NAVY,leading=37)
    b.text('Social / 1080 × 1080',50,524,11,'Medium',MUTED);b.text('Apresentação / 16:9',423,468,11,'Medium',MUTED)
    b.text('Em co-branding, separar assinaturas por ao menos 2x e equilibrar altura óptica. Não criar um logo composto permanente.',423,500,11,'Body',MUTED,maxw=477,leading=16)
    b.end()
    # 29
    b.start('05 / Acessibilidade e movimento','Conforto também é identidade.','As regras visuais precisam funcionar com teclado, leitor de tela, ampliação e preferência por menos movimento.',key='governance')
    checklist=[('Contraste','Texto normal ≥ 4,5:1. Texto grande e componentes essenciais ≥ 3:1. Nunca usar só cor para comunicar estado.'),('Foco e nomes','Foco visível; ordem lógica no teclado. Ícones de ação recebem nomes acessíveis e erros identificam os campos.'),('Tamanho e reflow','Web: alvos de pelo menos 24 CSS px conforme WCAG, priorizando 44 px no sistema. Mobile: 44 pt iOS / 48 dp Android.'),('Movimento','Transições discretas de 160-240 ms como ponto de partida. Honrar a redução de movimento; evitar animação decorativa contínua.')]
    for i,(a,d) in enumerate(checklist):b.card(50+(i%2)*438,172+(i//2)*178,422,162,a,d)
    b.end()
    # 30
    b.start('05 / Governança','Um sistema fácil de manter.','A consistência vem de arquivos claros, decisões registradas e revisão antes do uso.')
    steps=[('01','Escolher a versão','Usar SVG colorido em fundo claro, reverso no escuro e monocromático quando o meio exigir.'),('02','Conferir a aplicação','Respeitar proporção, proteção e mínimo. Testar o tamanho real, contraste, escala de texto e máscara de ícone.'),('03','Validar o conteúdo','Revisar ortografia, permissões de imagem e precisão de condições, preços, prazos e resultados.'),('04','Versionar a mudança','Registrar autor, data e motivo. Mudanças de logo, cores principais ou tipografia precisam de aprovação do responsável pela marca.')]
    for i,(num,a,d) in enumerate(steps):
        yy=178+i*84;b.text(num,52,yy,22,'Display',LINK);b.text(a,113,yy,20,'Display',NAVY);b.text(d,113,yy+31,12,'Body',MUTED,maxw=780,leading=17)
    b.end()
    # 31
    b.start('05 / Kit de marca','Arquivos para continuar com segurança.','Cada formato tem um uso. A origem aprovada permanece preservada no pacote.')
    entries=[('Manual','PDF de 32 páginas, com regras e exemplos visuais.'),('Logos','SVG com contornos: colorido, reverso e monocromáticos; PNGs de apoio.'),('Ícones','Matrizes iOS/Android, camadas de preparação e favicons Web.'),('Aplicações','Pranchas Web, iOS, Android, social e apresentação em PNG.'),('Sistema','Tokens em JSON/CSS, conteúdo editorial e fonte do gerador do manual.'),('Fontes','Bricolage Grotesque e Instrument Sans originais, com licenças OFL.')]
    for i,(a,d) in enumerate(entries):
        yy=174+i*48;b.text(a,52,yy,16,'Display',NAVY);b.text(d,233,yy+2,12,'Body',MUTED,maxw=667);b.line(50,yy+34,910,yy+34)
    b.text('Status desta edição',52,482,13,'Bold',LINK)
    b.text('O logo foi aprovado. As extensões do sistema são diretrizes elaboradas nesta v1.0. As telas são aplicações de marca; desenvolvimento, integração e publicação da plataforma são etapas posteriores.',52,506,11,'Body',MUTED,maxw=850,leading=16)
    b.end()
    # 32
    b.start('05 / Referências e créditos','Uma base verificável.','Fontes técnicas consultadas em 30/10/2026. O conceito aprovado e os materiais locais estão preservados no kit.')
    refs=[('Apple / App icons','https://developer.apple.com/design/human-interface-guidelines/app-icons'),('Apple / Accessibility','https://developer.apple.com/design/human-interface-guidelines/accessibility'),('Android / Adaptive icons','https://developer.android.com/develop/ui/compose/system/icon_design_adaptive'),('Android / Accessibility','https://developer.android.com/guide/topics/ui/accessibility/apps'),('Google Play / Icon design','https://developer.android.com/distribute/google-play/resources/icon-design-specifications'),('W3C / WCAG 2.2','https://www.w3.org/TR/WCAG22/'),('Google Fonts / Bricolage Grotesque','https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque'),('Google Fonts / Instrument Sans','https://github.com/google/fonts/tree/main/ofl/instrumentsans'),('Referência visual interna / site público','https://linklane.ai/')]
    for i,(name,url) in enumerate(refs):
        yy=168+i*32;b.text(name,52,yy,12,'Bold',NAVY);b.text(url,330,yy+1,8.2,'Body',LINK,maxw=570);b.c.linkURL(url,(48,H-yy-22,912,H-yy+3),relative=0,thickness=0)
    b.text('Conceito original: logo gerado por ImageGen e aprovado pelo usuário. Arte vetorial: reconstrução técnica dos contornos, com cores sólidas. Sistema editorial e aplicações: FreteNow / edição 1.0.',52,477,10,'Body',MUTED,maxw=850,leading=15)
    b.text('FreteNow',52,521,16,'Display',NAVY);b.text('Clareza para mover.',181,525,11,'Body',MUTED)
    b.end();b.save()
    (OUT/'qa'/'pages.json').write_text(json.dumps(b.records,ensure_ascii=False,indent=2),encoding='utf-8')
    assert len(b.records)==32
    # Separate vector application sheets for deterministic raster exports.
    for filename,ww,hh,fn in [('web-desktop',1440,900,lambda z:web(z,0,0,1440,900)),('web-institucional',1440,900,lambda z:web(z,0,0,1440,900,True)),('ios-home',780,1560,lambda z:phone(z,0,0,780,'ios')),('ios-detail-dark',780,1560,lambda z:phone(z,0,0,780,'ios',True,True)),('android-home',780,1560,lambda z:phone(z,0,0,780,'android')),('android-detail-dark',780,1560,lambda z:phone(z,0,0,780,'android',True,True))]:
        sheet=Book(WORK/f'{filename}.pdf',(ww,hh),False);sheet.rect(0,0,ww,hh,WHITE);fn(sheet);sheet.c.showPage();sheet.save()
    social=Book(WORK/'social-quadrado.pdf',(1080,1080),False)
    social.rect(0,0,1080,1080,NAVY);social.mark(95,85,150,'white')
    social.text('Seu frete,\ncom mais\nclareza.',95,350,122,'Display',WHITE,leading=132)
    social.logo(95,900,530,'reverse');social.c.showPage();social.save()
    slide=Book(WORK/'apresentacao-capa.pdf',(1920,1080),False)
    slide.rect(0,0,1920,1080,BG);slide.logo(108,89,540)
    slide.text('Informação clara.\nPróximos passos\nbem definidos.',108,354,100,'Display',NAVY,leading=115)
    slide.rect(108,935,128,8,BLUE,r=4);slide.c.showPage();slide.save()
    print(json.dumps({'pdf':str(OUT/'FreteNow-Brandbook-v1.0.pdf'),'pages':32},ensure_ascii=True))

if __name__=='__main__':build()
