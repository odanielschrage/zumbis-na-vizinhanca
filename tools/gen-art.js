// Gerador de arte por IA (Gemini) com consistência por construção.
// Uso: node tools/gen-art.js <job> [--ref caminho.png] [--model nome]
// A chave vem de GEMINI_API_KEY (resolvida pela skill credenciais-api).
const fs = require('fs');
const path = require('path');

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY ausente no ambiente'); process.exit(1); }

const OUT = path.join(__dirname, '..', 'assets', 'ai');
fs.mkdirSync(OUT, { recursive: true });

// ---- âncora de estilo: idêntica em TODAS as gerações ----
const STYLE = `
ART STYLE (apply exactly): high-quality 2D game sprite for a modern top-down zombie survival game,
3/4 top-down camera slightly above and in front of the subject. Painted digital illustration with
realistic human proportions (about 7 heads tall), clean readable silhouettes, soft painterly cel
shading with visible material detail (fabric weave, skin, metal, wood), subtle rim light from the
top-left, muted cinematic palette that still reads clearly at small size. NO black outlines.
Background: flat, uniform, pure bright green (#00FF00) for chroma keying. No ground shadow,
no floor, no text, no labels, no watermark, no frame.`;

// âncora para TEXTURAS de ambiente: sem chroma, sem personagem, tem que ladrilhar
const TEXTURE_STYLE = `
ART STYLE (apply exactly): painted digital texture for a modern top-down zombie survival game,
viewed straight from above. Painterly but detailed material rendering, muted cinematic palette,
soft even lighting with NO directional shadows. The image is a SEAMLESS TILE: its left edge must
continue perfectly into its right edge and its top edge into its bottom edge, with no visible
seam or border. Absolutely no characters, creatures, objects, props, text, labels or watermark —
only the surface material filling the whole frame.`;

const REF_NOTE = `
CONSISTENCY: match the art style, rendering technique, lighting direction, camera angle, line
quality and color treatment of the attached reference image EXACTLY, so this asset looks like it
belongs to the same game as the reference.`;

const JOBS = {
  // herói de referência: ficha com 3 vistas na MESMA imagem
  rex: {
    aspect: '16:9',
    prompt: `Character reference sheet of ONE hero, named Rex: a tough teenage boy, tan skin, bold
red mohawk, dark charcoal sleeveless shirt with a small silver emblem on the chest, dark pants,
dark-red high-top sneakers, athletic build. Show the SAME character three times in a single
horizontal row, identical outfit, proportions and scale, evenly spaced, each figure fully visible
head to toe with generous margin: (1) FRONT view facing the camera, (2) BACK view, (3) RIGHT SIDE
profile view. Idle standing pose, arms relaxed at the sides, EMPTY HANDS (no weapon at all).`,
  },
  zombie: {
    aspect: '16:9',
    prompt: `Character reference sheet of ONE enemy: a shambling undead walker — a middle-aged man
turned zombie, grayish-green decaying skin, torn dirty button shirt and stained trousers,
hunched forward posture, arms hanging loosely forward, sunken pale glowing eyes, slack jaw.
Show the SAME zombie three times in a single horizontal row, identical clothes and scale, evenly
spaced, fully visible head to toe with generous margin: (1) FRONT view, (2) BACK view,
(3) RIGHT SIDE profile view. Menacing but readable, not gory.`,
  },
  weapons: {
    aspect: '16:9',
    prompt: `Game item sheet: three handheld weapons laid out in ONE horizontal row, each fully
isolated, same scale, all in strict RIGHT-facing side view (barrel pointing right), evenly spaced
with margin: (1) a compact semi-automatic pistol, (2) a pump-action shotgun with a wooden stock,
(3) a flamethrower with a short nozzle and a small fuel canister. Realistic materials: brushed
metal, worn wood, rubber grips. Crisp, detailed, no hands, no characters.`,
  },
  // herói em POSE DE MIRA: mãos vazias em pegada de arma → a arma gerada à parte encaixa aqui
  rex_aim: {
    aspect: '16:9',
    prompt: `Character reference sheet of the SAME hero as the reference image (Rex: red mohawk,
charcoal sleeveless shirt with silver emblem, dark pants, dark-red high-top sneakers). Show him
three times in a single horizontal row, identical outfit and scale, evenly spaced, fully visible
head to toe with generous margin: (1) FRONT view, (2) BACK view, (3) RIGHT SIDE profile view.
ACTION POSE in all three: both arms raised forward at chest height, hands close together in a
two-handed firearm grip, slight forward lean, alert ready stance — but the HANDS ARE EMPTY, no
weapon or object drawn at all (the weapon is composited later). In the side view the arms point
to the right.`,
  },
  ground: {
    aspect: '1:1',
    texture: true,
    prompt: `Cracked old asphalt road surface with faint worn lane paint, small pebbles and a few
dry leaves, night-time, muted and desaturated.`,
  },
};

async function generate(name, opts) {
  const job = JOBS[name];
  if (!job) { console.error('job desconhecido:', name, '— disponíveis:', Object.keys(JOBS).join(', ')); process.exit(1); }
  const model = opts.model || 'gemini-3-pro-image';

  const parts = [];
  let text = (job.texture ? TEXTURE_STYLE : STYLE) + '\n' + job.prompt;
  if (opts.ref) {
    const refData = fs.readFileSync(opts.ref).toString('base64');
    parts.push({ inlineData: { mimeType: 'image/png', data: refData } });
    text += REF_NOTE;
  }
  parts.push({ text });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: job.aspect },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error('ERRO HTTP', res.status, JSON.stringify(json).slice(0, 600)); process.exit(2); }

  const cand = (json.candidates || [])[0];
  const img = cand && cand.content && cand.content.parts.find(p => p.inlineData);
  if (!img) {
    console.error('sem imagem na resposta:', JSON.stringify(json).slice(0, 800));
    process.exit(3);
  }
  const ext = /jpeg|jpg/i.test(img.inlineData.mimeType) ? 'jpg' : 'png';
  const file = path.join(OUT, `${name}.${ext}`);
  fs.writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
  console.log(`ok ${name} → ${path.relative(process.cwd(), file)} (${img.inlineData.mimeType}, ${((Date.now() - t0) / 1000).toFixed(1)}s, modelo ${model}${opts.ref ? ', com referência' : ''})`);
}

// ---- CLI ----
const args = process.argv.slice(2);
const name = args.find(a => !a.startsWith('--'));
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (!name) { console.log('jobs:', Object.keys(JOBS).join(', ')); process.exit(0); }
generate(name, { ref: opt('--ref'), model: opt('--model') }).catch(e => { console.error(e); process.exit(9); });
