# Reduz o peso das fichas geradas (assets/ai) sem prejudicar o chroma key.
# - Metade da resolução: figuras ficam com ~345px de altura (em jogo são ~128px).
# - JPEG q84, progressivo, croma 4:4:4 (subsampling=0): a borda verde/figura fica
#   nítida, o que importa mais para o recorte do que alguns KB.
# Idempotente: pula o redimensionamento se a imagem já está no tamanho alvo.
# Uso: python tools/optimize-art.py
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ai')
TARGET_W = 688          # fichas 16:9 (1376 → 688)
GROUND_W = 768          # textura ladrilhada: guarda mais resolução
Q = 84

total_before = total_after = 0
for f in sorted(os.listdir(SRC)):
    if not f.lower().endswith('.jpg'):
        continue
    p = os.path.join(SRC, f)
    before = os.path.getsize(p)
    im = Image.open(p).convert('RGB')
    w, h = im.size
    tw = GROUND_W if f == 'ground.jpg' else TARGET_W
    if w <= tw:
        # já otimizado: não re-salva (re-encodar JPEG sobre JPEG degrada a cada passada)
        print(f'{f:24s} ok ({w}x{h}, {before // 1024}KB)')
        total_before += before; total_after += before
        continue
    im = im.resize((tw, round(h * tw / w)), Image.LANCZOS)
    im.save(p, 'JPEG', quality=Q, optimize=True, subsampling=0, progressive=True)
    after = os.path.getsize(p)
    total_before += before; total_after += after
    print(f'{f:18s} {w}x{h} -> {im.size[0]}x{im.size[1]}  {before//1024:5d}KB -> {after//1024:4d}KB')
print(f'\nTOTAL {total_before/1024/1024:.1f}MB -> {total_after/1024/1024:.1f}MB')
