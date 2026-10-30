"""Package only authorized branding artifacts. No project/runtime secrets."""
from pathlib import Path
import json,hashlib,shutil,zipfile,html
from pypdf import PdfReader
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
BRAND=ROOT/'docs/brand'; OUT=ROOT/'output/brandbook'; KIT=OUT/'kit'
def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
palette={'navy':'#0A1F4E','blue':'#0177FD','sky':'#7DB8FF','action':'#0166D9','link':'#0A5FC7','page':'#F2F4F8','white':'#FFFFFF','text':'#1A1A1A','muted':'#56647B','border':'#D8DFEA','success':'#14733A','successSurface':'#E7F6EC','warning':'#9A4C05','warningSurface':'#FDF3E1','danger':'#B91C1C','dangerSurface':'#FDEEEE','institutionalBackground':'#0A0A0A','institutionalText':'#FFFFFF','institutionalMuted':'#D4D4D4'}
tokens={'brand':'FreteNow','version':'1.0','date':'2026-10-30','status':'Logo aprovado; sistema de marca elaborado nesta edição; aplicações conceituais, sem plataforma implementada.','colors':palette,'dark':{'background':'#0E1B30','surface':'#152642','text':'#FFFFFF','muted':'#B9CBE8','action':'#7DB8FF','onAction':'#0A1F4E'},'typography':{'display':{'family':'Bricolage Grotesque','weight':650,'width':100},'body':{'family':'Instrument Sans','weights':[400,550,700]},'mobileBody':'Usar fonte do sistema quando necessário para preservar Dynamic Type / escala de fonte.','wordmark':'Usar contornos do SVG; não substituir por fonte digitada.'},'space':[4,8,12,16,24,32,48,64],'radius':{'small':4,'control':8,'card':12,'large':16,'pill':999},'motion':{'durationMs':[160,240],'reducedMotion':'Desativar movimento não essencial conforme preferência da pessoa.'},'touchTargets':{'webRecommendedCssPx':44,'iosPt':44,'androidDp':48},'logo':{'protection':'x = 1/4 da altura do símbolo','horizontalMinPx':156,'horizontalMinMm':28,'symbolMinPx':24,'symbolMinMm':6,'faviconExceptionPx':16},'platforms':{'web':'Portal azul; site público pode usar expressão editorial escura monocromática.','ios':'Áreas seguras, tipografia dinâmica, navegação nativa.','android':'Toque 48dp, sp, ícone adaptativo e camada monochrome.'}}
write(BRAND/'brandbook-v1.0.json',{'project':'FreteNow','version':'1.0','logoApproval':{'source':'Mensagem do usuário nesta sessão','quote':'Gostei, pode seguir com esse logo e montar o brandbook completo da FreteNow, incluindo as aplicações na Web, iOS e Android.','date':'2026-10-30'},'websiteCorrection':{'source':'Observação do usuário nesta sessão','url':'https://linklane.ai/','decision':'Distinguir a expressão do site público da interface do portal. Hero público inspecionado visualmente: escuro, tipografia branca, predomínio neutro.','impact':'Aplicação institucional da v1 usa base preta, marca monocromática e hierarquia editorial; portal e apps mantêm sistema azul.'},'status':'Manual v1.0 e kit elaborados para uso/revisão. Não foi iniciada a implementação da plataforma.','artifacts':{'pdf':'output/brandbook/FreteNow-Brandbook-v1.0.pdf','kit':'output/brandbook/FreteNow-Kit-de-Marca-v1.0.zip'},'historicalBrief':'docs/brand/brand-direction-v0.1.json','approvalBoundary':'Aprovação explícita do logo e autorização de montar o manual. Assinatura editorial e extensões do sistema foram elaboradas nesta edição; não afirmar aprovação individual de cada regra.'})
for sub in ['logos/svg','fonts','original','guidelines','source','applications']:(KIT/sub).mkdir(parents=True,exist_ok=True)
for f in (BRAND/'assets/svg').glob('*.svg'):shutil.copy2(f,KIT/'logos/svg'/f.name)
for f in (BRAND/'assets/fonts').iterdir():shutil.copy2(f,KIT/'fonts'/f.name)
for name in ['brand-content.json','platform-guidelines.json']:
    shutil.copy2(BRAND/'work'/name,KIT/'guidelines'/name)
for name in ['build_brandbook.py','vectorize_logo.py','export_brand_assets.ps1','package_brandbook.py']:
    f=BRAND/'work'/name
    if f.exists():shutil.copy2(f,KIT/'source'/name)
write(KIT/'guidelines'/'design-tokens.json',tokens)
css='/* FreteNow v1.0 - reference design tokens; no platform implementation */\n:root {\n'
for key,val in palette.items():css+=f'  --fn-{key}: {val};\n'
css+='  --fn-font-display: "Bricolage Grotesque", system-ui, sans-serif;\n  --fn-font-body: "Instrument Sans", system-ui, sans-serif;\n}\n'
(KIT/'guidelines/design-tokens.css').write_text(css,encoding='utf-8')
shutil.copy2(BRAND/'brandbook-v1.0.json',KIT/'guidelines'/'brandbook-v1.0.json')
geom=json.loads((BRAND/'work/logo-geometry.json').read_text(encoding='utf-8'))
src=Path(geom['source']['path']);assert hashlib.sha256(src.read_bytes()).hexdigest()==geom['source']['sha256']
shutil.copy2(src,KIT/'original/logo-aprovado.png')
geom['source']['path']='original/logo-aprovado.png'
write(KIT/'guidelines'/'logo-geometry.json',geom)
for f in (OUT/'applications').glob('*.png'):shutil.copy2(f,KIT/'applications'/f.name)
pdf=OUT/'FreteNow-Brandbook-v1.0.pdf';shutil.copy2(pdf,KIT/pdf.name)
readme='''# FreteNow / Kit de marca 1.0

O manual PDF reúne identidade, posicionamento, tom de voz, logo, proteção, mínimos, cores, tipografia, acessibilidade e aplicações Web, iOS, Android, documentos e comunicação.

O logo foi aprovado por Leo em 30/10/2026. Os SVGs são uma reconstrução técnica fiel em contornos, com cores sólidas. O PNG aprovado foi preservado em original/. O wordmark não depende de uma fonte instalada; não o redigite.

## Escolha do arquivo

- logos/svg: matriz escalável para design, Web e impressão. Arquivos reversos para fundo escuro; monocromáticos para reprodução em uma cor.
- logos/png: versões de apoio com transparência; não usar imagem branca sobre fundo branco.
- icons: matrizes de marca e camadas de preparação. Arquivos PNG/SVG não são um projeto Xcode, pacote .icon ou aplicativo Android. O empacotamento nativo e a revisão no Icon Composer/launchers serão feitos durante a implementação.
- applications: exemplos visuais com dados fictícios. Não são aplicativos funcionais ou telas já publicadas. Referências mobile incluem moldura ilustrativa, sem representar um modelo específico de aparelho.
- fonts: fontes variáveis originais e suas licenças SIL OFL. Preservar as licenças ao redistribuir.
- guidelines: conteúdo editorial completo, fontes oficiais verificadas, geometria, tokens e registro de aprovação.
- source: scripts de construção do manual e exportação; são fontes de produção editorial, não código da plataforma.

## Site e plataforma

O portal e os aplicativos usam a linguagem azul. A aplicação institucional usa uma expressão escura, predominantemente monocromática, a partir da distinção apontada por Leo no site público linklane.ai. Essa referência é interna e não indica parceria ou endosso.

## Aprovação e edição

O logo está aprovado. A assinatura “Clareza para mover.” é uma proposta editorial opcional desta edição; não integra o desenho obrigatório do logo. Regras complementares foram elaboradas na v1.0 e devem orientar a revisão das aplicações finais. Não foi iniciada a implementação da plataforma.

## Reprodução dos materiais

Os scripts originais permanecem em docs/brand/work/ no projeto. Dependências editoriais: Python, reportlab, pypdf, Pillow e FontTools; Poppler para renderização. A organização do workspace e os caminhos de runtime devem ser ajustados em outro computador. SVG/PNG/PDF e as fontes originais são utilizáveis independentemente dos scripts.
'''
(KIT/'LEIA-ME.md').write_text(readme,encoding='utf-8')
files=[]
for f in sorted(KIT.rglob('*')):
    if f.is_file() and f.name!='manifest.json':files.append({'path':f.relative_to(KIT).as_posix(),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
write(KIT/'manifest.json',{'version':'1.0','date':'2026-10-30','brand':'FreteNow','files':files,'pdfPages':len(PdfReader(pdf).pages),'sourcePreserved':True})
archive=OUT/'FreteNow-Kit-de-Marca-v1.0.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(KIT.rglob('*')):
        if f.is_file():z.write(f,Path('FreteNow-Kit-v1.0')/f.relative_to(KIT))
index='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FreteNow / Brandbook 1.0</title><style>body{margin:0;background:#f2f4f8;color:#0a1f4e;font:16px system-ui,sans-serif}main{max-width:1100px;margin:64px auto;padding:0 24px}h1{font-size:42px}a{color:#0a5fc7}nav{display:flex;gap:24px;margin:32px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0;background:white;padding:20px;border-radius:16px}img{width:100%;height:280px;object-fit:contain}figcaption{margin-top:16px;font-size:14px}</style><main><h1>FreteNow / Brandbook 1.0</h1><p>Identidade visual, comunicação e aplicações para Web, iOS e Android.</p><nav><a href="FreteNow-Brandbook-v1.0.pdf">Abrir o manual de 32 páginas</a><a href="FreteNow-Kit-de-Marca-v1.0.zip">Baixar o kit completo</a></nav><p>Exemplos visuais com dados fictícios. A implementação da plataforma é uma etapa posterior.</p><div class="grid">'''
for name,label in [('web-desktop','Portal Web'),('web-institucional','Site institucional'),('ios-home','iOS'),('android-home','Android'),('social-quadrado','Conteúdo social'),('apresentacao-capa','Apresentação')]:index+=f'<figure><a href="applications/{name}.png"><img alt="Aplicação de marca: {label}" src="applications/{name}.png"></a><figcaption>{label}</figcaption></figure>'
index+='</div></main></html>'
(OUT/'index.html').write_text(index,encoding='utf-8')
checks={'pdfPages':len(PdfReader(pdf).pages),'pdfBytes':pdf.stat().st_size,'archiveBytes':archive.stat().st_size,'archiveFiles':len(files)+1,'applications':{f.name:Image.open(f).size for f in (OUT/'applications').glob('*.png')},'sourceSha256':geom['source']['sha256'],'sourceUnchanged':True}
write(OUT/'qa'/'verification.json',checks)
print(json.dumps(checks,ensure_ascii=True))
