import {ORIGINAL_SCALES} from './original-scales.js';
export const LETTERS=['C','D','E','F','G','A','B'];
export const SOLFEGE=['Dó','Ré','Mi','Fá','Sol','Lá','Si'];
const NATURAL=[0,2,4,5,7,9,11];
export const ROOTS=['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'];
const diatonic=[0,1,2,3,4,5,6,7];
export const SCALES={
 major:{name:'Maior',intervals:[0,2,4,5,7,9,11,12],degrees:diatonic},
 minor:{name:'Menor natural',intervals:[0,2,3,5,7,8,10,12],degrees:diatonic},
 harmonicMinor:{name:'Menor harmônica',intervals:[0,2,3,5,7,8,11,12],degrees:diatonic},
 melodicMinor:{name:'Menor melódica',intervals:[0,2,3,5,7,9,11,12],degrees:diatonic},
 ionian:{name:'Jônio',intervals:[0,2,4,5,7,9,11,12],degrees:diatonic},
 dorian:{name:'Dórico',intervals:[0,2,3,5,7,9,10,12],degrees:diatonic},
 phrygian:{name:'Frígio',intervals:[0,1,3,5,7,8,10,12],degrees:diatonic},
 lydian:{name:'Lídio',intervals:[0,2,4,6,7,9,11,12],degrees:diatonic},
 mixolydian:{name:'Mixolídio',intervals:[0,2,4,5,7,9,10,12],degrees:diatonic},
 aeolian:{name:'Eólio',intervals:[0,2,3,5,7,8,10,12],degrees:diatonic},
 locrian:{name:'Lócrio',intervals:[0,1,3,5,6,8,10,12],degrees:diatonic},
 wholeTone:{name:'Tons inteiros',intervals:[0,2,4,6,8,10,12],degrees:[0,1,2,3,4,5,7]},
 chromatic:{name:'Cromática',intervals:[0,1,2,3,4,5,6,7,8,9,10,11,12],degrees:[0,0,1,1,2,3,3,4,4,5,5,6,7]},
 pentatonicMajor:{name:'Pentatônica maior',intervals:[0,2,4,7,9,12],degrees:[0,1,2,4,5,7]},
 pentatonicMinor:{name:'Pentatônica menor',intervals:[0,3,5,7,10,12],degrees:[0,2,3,4,6,7]},
 blues:{name:'Blues',intervals:[0,3,5,6,7,10,12],degrees:[0,2,3,3,4,6,7]},
 diminished:{name:'Diminuta',intervals:[0,2,3,5,6,8,9,11,12],degrees:[0,1,2,3,3,4,5,6,7]},
 dominantDiminished:{name:'Dominante diminuta',intervals:[0,1,3,4,6,7,9,10,12],degrees:[0,1,2,2,3,4,5,6,7]},
 augmented:{name:'Aumentada',intervals:[0,3,4,7,8,11,12],degrees:[0,1,2,4,5,6,7]}
};
export const CATEGORIES={
 majorMinor:{name:'Maiores e Menores',types:['major','minor']},
 minors:{name:'3 Menores',types:['minor','harmonicMinor','melodicMinor']},
 greek:{name:'Modos Gregos',types:['ionian','dorian','phrygian','lydian','mixolydian','aeolian','locrian']},
 special:{name:'Especiais',types:['wholeTone','chromatic','pentatonicMajor','pentatonicMinor','blues','diminished','dominantDiminished','augmented']}
};
export function parseNote(value){const m=/^([A-G])([#b]{0,2})(-?\d+)?$/.exec(value);if(!m)throw new Error('Nota inválida');const letter=LETTERS.indexOf(m[1]),accidental=[...m[2]].reduce((a,c)=>a+(c==='#'?1:-1),0),octave=m[3]===undefined?4:Number(m[3]);return{letter,accidental,octave,midi:12*(octave+1)+NATURAL[letter]+accidental,name:m[1]+m[2]};}
export function noteLabel(n){if(typeof n==='string')n=parseNote(n);return SOLFEGE[n.letter]+(n.accidental>0?'♯'.repeat(n.accidental):'♭'.repeat(-n.accidental));}
export function makeScale(root,type,octave=4){const r=parseNote(root+octave),s=SCALES[type];if(!s)throw new Error('Escala inválida');return s.intervals.map((interval,i)=>{const d=r.letter+s.degrees[i],letter=d%7,o=octave+Math.floor(d/7),midi=r.midi+interval,accidental=midi-(12*(o+1)+NATURAL[letter]);return{letter,accidental,octave:o,midi,name:LETTERS[letter]+(accidental>0?'#'.repeat(accidental):'b'.repeat(-accidental))};});}
export function shuffled(a,rng=Math.random){const copy=[...a];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
const SOURCE_NAMES={major:'DiatonicMajor',minor:'DiatonicMinor',harmonicMinor:'HarmonicMinor',melodicMinor:'MelodicMinor',ionian:'Ionian',dorian:'Dorian',phrygian:'Phrygian',lydian:'Lydian',mixolydian:'Mixolydian',aeolian:'Aeolian',locrian:'Locrian',wholeTone:'WholeTones',chromatic:'Chromatic',pentatonicMajor:'MajorPentatonic',pentatonicMinor:'MinorPentatonic',blues:'BluesScale',diminished:'Diminished',dominantDiminished:'DominantDiminished',augmented:'Augmented'};
export function originalScale(type,index=0,octave=4){
 const source=ORIGINAL_SCALES.find(s=>s.name===SOURCE_NAMES[type]);if(!source)throw new Error('Escala original ausente');
 const variant=source.variants[(index+source.variants.length)%source.variants.length];
 function decode(desc){let signature='',key={};const notes=[];let o=octave,previous=-Infinity;for(const raw of variant){const token=raw.split('|')[desc?1:0]||raw.split('|')[0];if(token.startsWith('ARM')){signature=token;key={};const m=/ARM(\d)([#b])/.exec(token);if(m){const order=m[2]==='#'?[3,0,4,1,5,2,6]:[6,2,5,1,4,0,3];for(let i=0;i<Number(m[1]);i++)key[order[i]]=m[2]==='#'?1:-1;}continue;}const m=/^([A-G])([#b]*|\[\])$/.exec(token);if(!m)throw new Error('Nota original inválida '+token);const letter=LETTERS.indexOf(m[1]),explicit=!!m[2],accidental=m[2]==='[]'?0:m[2]?[...m[2]].reduce((v,c)=>v+(c==='#'?1:-1),0):(key[letter]||0);let midi=12*(o+1)+NATURAL[letter]+accidental;if(midi<previous){o++;midi+=12;}previous=midi;notes.push({letter,accidental,octave:o,midi,name:m[1]+(accidental>0?'#'.repeat(accidental):'b'.repeat(-accidental)),displayAccidental:explicit?(accidental===0?'♮':accidental>0?'♯'.repeat(accidental):'♭'.repeat(-accidental)):''});}notes.keySignature=signature;return notes;}
 const notes=decode(false);notes.descendingNotes=decode(true);return notes;
}
export function originalVariants(type){const s=ORIGINAL_SCALES.find(s=>s.name===SOURCE_NAMES[type]);return s?s.variants.length:1;}
export function orderedNotes(notes,direction='ascending'){const down=notes.descendingNotes||notes;return direction==='descending'?[...down].reverse():direction==='both'?[...notes,...down.slice(0,-1).reverse()]:[...notes];}
export function scaleSvg(notes,clef='treble',direction='ascending',showDegrees=false){
 const ns=direction==='descending'?orderedNotes(notes,direction):notes;
 const c={treble:{bottom:30,glyph:'𝄞',y:139},bass:{bottom:18,glyph:'𝄢',y:116},alto:{bottom:24,glyph:'𝄡',y:133}}[clef]||{bottom:30,glyph:'𝄞',y:139};
 const width=Math.max(680,110+ns.length*48), bottomY=144;
 const ps=ns.map((n,i)=>({n,x:100+i*(width-130)/(ns.length-1),y:bottomY-(n.octave*7+n.letter-c.bottom)*6}));
 const minY=Math.min(70,...ps.map(p=>p.y)),maxY=Math.max(144,...ps.map(p=>p.y));
 const top=Math.min(15,minY-40),height=Math.max(220,maxY+42)-top;
 const lines=[0,1,2,3,4].map(i=>`<line x1="15" y1="${bottomY-i*12}" x2="${width-12}" y2="${bottomY-i*12}"/>`).join('');
 const key=/ARM(\d)([#b])/.exec(notes.keySignature||'');const keyText=key?`<text x="70" y="110" font-size="18">${(key[2]==='#'?'♯':'♭').repeat(Number(key[1]))}</text>`:'';
 // When a signature is present, show its alteration explicitly on each note to keep the compact staff readable.
 return `<svg class="scale-staff" viewBox="0 ${top} ${width} ${height}" role="img" aria-label="Partitura da escala"><g class="staff-lines" fill="none" stroke="currentColor" stroke-width="1">${lines}</g><text x="27" y="${c.y}" font-size="70" font-family="Segoe UI Symbol,serif">${c.glyph}</text>${ps.map(({n,x,y},i)=>{let ledger='';for(let l=156;l<=y;l+=12)ledger+=`<line x1="${x-13}" y1="${l}" x2="${x+13}" y2="${l}"/>`;for(let l=84;l>=y;l-=12)ledger+=`<line x1="${x-13}" y1="${l}" x2="${x+13}" y2="${l}"/>`;const accidental=n.accidental>0?'♯'.repeat(n.accidental):n.accidental<0?'♭'.repeat(-n.accidental):n.displayAccidental||'';return `<g stroke="currentColor" stroke-width="1">${ledger}<ellipse fill="currentColor" cx="${x}" cy="${y}" rx="8" ry="5" transform="rotate(-20 ${x} ${y})"/><line x1="${x+7}" y1="${y}" x2="${x+7}" y2="${y-26}"/></g><text x="${x-19}" y="${y+5}" text-anchor="end" font-size="19">${accidental}</text>${showDegrees?`<text x="${x}" y="${height+top-12}" text-anchor="middle" font-size="15">${i+1}</text>`:''}`;}).join('')}</svg>`;
}
