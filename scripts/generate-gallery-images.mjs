// Generate independent, reference-based illustrations; keeps raw art and prompts.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'assets/cat-reference/gallery-v1');
const executable = 'C:/Users/22639/.codex/skills/codex-image2/bin/codex-image2-windows-amd64.exe';
const references = ['assets/cats/ending-play-happy.png', 'assets/cats/guide-talk-dry.png'].map(file => path.join(root, file));
const scenes = [
  ['warm-tea', 'The two cats sit facing each other on tiny floor cushions and share a warm pot of tea. The white-gray cat carefully pours tea into the gray cat\'s little cup. The gray cat holds the cup with both paws and smiles warmly. A single small heart floats above the teapot.'],
  ['bubble-jump', 'The white-gray cat blows two large soap bubbles with a bubble wand. The gray cat leaps off the ground with both front paws reaching for a bubble, laughing. Show lively contrasting poses and a tiny bubble bottle on the ground.'],
  ['little-letter', 'The two cats sit at a very low little writing desk. The white-gray cat writes a small love letter using a pencil, and the gray cat gently holds a little pink heart envelope open beside the letter. They quietly concentrate with sweet smiles. No readable writing on the paper.'],
  ['moon-cushion', 'The two cats curl up peacefully side by side on a single soft crescent-moon-shaped pale lavender cushion. One cat gazes affectionately at the other; the other sleeps with relaxed closed eyes. Exactly two tiny stars hang above them.'],
  ['blanket-home', 'The white-gray cat and gray cat build a cozy tiny blanket tent together. The gray cat lifts one corner of a pale peach blanket while the white-gray cat arranges one round cushion inside the tent. Show the whole simple little tent and both cats clearly.'],
  ['packing-picnic', 'The two cats eagerly pack one small open picnic basket. The white-gray cat holds a baguette ready to put it inside; the gray cat ties a muted pink ribbon on the basket handle. Include one small apple in the basket. Both smile with anticipation.'],
  ['acorn-keepsake', 'The two cats sit close together sorting three little acorns and a single pressed leaf into a small open keepsake box. The white-gray cat carefully offers an acorn with both paws; the gray cat holds the box and smiles. Use gentle thoughtful poses.'],
  ['scarf-nuzzle', 'The two cats stand cheek to cheek in a playful affectionate side hug, sharing one long pale pink knitted scarf wrapped loosely around their necks. One scarf end has fallen on the ground. Both close their eyes with relaxed happy smiles, tails curving toward each other.'],
  ['string-phone', 'The two cats play with a simple tin-can string telephone. They sit apart with a clearly visible taut string between two tiny cups. The white-gray cat talks happily into its cup and the gray cat holds the other cup to its ear, listening with bright curious eyes.'],
  ['kite-day', 'The white-gray cat runs with a small spool of string while the gray cat helps launch a single small muted pink diamond-shaped kite overhead. Both cats laugh with their tails raised. A curved kite string links the simple composition. Keep all of the kite inside the frame.'],
  ['lantern-welcome', 'The gray cat waits patiently beside a tiny warm lantern placed on the ground. The white-gray cat approaches slowly holding one small flower behind its back, shyly peeking toward the gray cat. Both are gently smiling. Show a visible small gap between them and no building.'],
  ['star-watch', 'The two cats share one small toy telescope on a short tripod. The white-gray cat looks through its eyepiece while the gray cat points up at a small cluster of three pastel yellow stars. Both have delighted curious expressions. Keep the stars and telescope compact around the cats.'],
  ['soup-kitchen', 'The two cats cook a little pot of soup together at a very low portable cooking stand. The white-gray cat gently stirs with a wooden spoon; the gray cat holds a tiny bowl and a carrot ready to help. Both wear simple cream aprons, their original fur markings clearly visible. Two soft steam curls above the pot.'],
  ['trail-map', 'The two cats walk side by side wearing tiny muted green backpacks. The white-gray cat holds an unfolded map with simple paths but no text, and the gray cat points ahead enthusiastically. A single tiny pebble and leaf suggest a trail, with no landscape or scenery.'],
  ['garden-care', 'The two cats tend a single small terracotta flowerpot together. The white-gray cat pours a gentle stream from a tiny watering can; the gray cat steadies the pot with both paws. One little green plant with a pink flower grows in the pot. Both smile quietly.'],
  ['paper-flight', 'The two cats lounge on separate small cloud-shaped floor pillows, comfortably close without touching. The white-gray cat has just launched a single little paper airplane; the gray cat lies on its tummy watching it float above them with a contented smile. Show a short dotted flight curve and no sky scenery.'],
];
const shared = `Asset type: one standalone sticker illustration for a relationship-themed cat field guide website.
The two input images are CHARACTER IDENTITY AND DRAWING STYLE REFERENCES ONLY. Invent the new action below; do not repeat the reference activity, poses or props.
Keep exactly the SAME TWO characters: one off-white cat with cool-gray ears, a distinctive central gray forehead patch, gray tail and gray paw tips; one solid cool-gray cat with pink inner ears. Both have very large rounded heads, short chubby bodies, short limbs, rounded paws, tiny noses, expressive eyes and whiskers.
Match the reference's irregular warm taupe colored-pencil contours, soft crayon fill and subtle paper grain. Muted dusty pink, lavender, sage and warm cream accents. Soft, tender, playful and readable at thumbnail scale. Keep their original proportions and recognizable fur markings.
Composition: one compact complete vignette, both cats equally visible with all heads, ears, paws, tails and props fully in frame. Center the entire scene within the middle 78 percent of the square, leave clean empty margin on every edge. Foreground characters and a few small props only. Flat pure white background, no cast shadow, no rectangular backdrop, no gradient, no border.
Both cats must have entirely DRY cheeks: no tears, crying, sweat drops, tear streaks or white moisture marks on the gray cat. Happy or gentle dry-eyed expressions only.
No lettering, no text, no numbers, no watermark. No extra cats or characters. No extra limbs or duplicate heads. No photorealism, 3D, anime shading or glossy vector finish.
New unique scene: `;

await mkdir(destination, { recursive: true });
const jobs = scenes.map(([slug, scene], index) => ({ number: index + 1, slug, prompt: shared + scene, model: 'gpt-image-2.6', size: '1024x1024', quality: 'medium', references: references.map(ref => path.relative(root, ref).replaceAll('\\', '/')) }));
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(jobs, null, 2) + '\n');
for (const job of jobs) await writeFile(path.join(destination, `prompt-${String(job.number).padStart(2, '0')}.txt`), job.prompt + '\n');

const start = Number(process.argv[2] || 1);
const end = Number(process.argv[3] || 16);
const pending = jobs.filter(job => job.number >= start && job.number <= end);
let failed = 0;
async function worker() {
  while (pending.length) {
    const job = pending.shift();
    const id = String(job.number).padStart(2, '0');
    const output = path.join(destination, `source-${id}.png`);
    try { await access(output); console.log(`Kept existing ${id} ${job.slug}`); continue; } catch {}
    console.log(`Generating ${id} ${job.slug}`);
    const args = ['edit', ...references.flatMap(ref => ['--image', ref]), '--prompt-file', path.join(destination, `prompt-${id}.txt`), '--model', job.model, '--size', job.size, '--quality', job.quality, '--timeout', '240', '--max-attempts', '2', '--out', output];
    const code = await new Promise(resolve => {
      const child = spawn(executable, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let log = '';
      child.stdout.on('data', data => { log += data; });
      child.stderr.on('data', data => { log += data; });
      child.on('error', () => resolve(-1));
      child.on('close', code => { if (code !== 0) console.log(`Failed ${id}: ${log.slice(-1200)}`); resolve(code); });
    });
    if (code !== 0) failed++;
    else console.log(`Saved ${id} ${job.slug}`);
  }
}
await Promise.all([worker(), worker()]);
console.log(`Generation finished. Failed: ${failed}. Sources: ${destination}`);
if (failed) process.exitCode = 1;
