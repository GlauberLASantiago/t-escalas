import {SCALES,CATEGORIES,scaleSvg,noteLabel,orderedNotes} from './music.js';
import {DIFFICULTIES,PHASE_COUNTS,phaseConfig,createSession,answer,tick,nextQuestion} from './game.js';

const $=id=>document.getElementById(id);
const categoryKeys=Object.keys(CATEGORIES);
const phaseCounts=PHASE_COUNTS;
const scenes=['menu','career','practice','briefing','game','results','lessons','about'];
let scene='menu',session=null,pendingConfig=null,lastConfig=null,loopId=null,lessons=null,lessonKey=null,audioContext=null,voices=[],audioToken=0,audioTimer=null;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{ /* Storage is optional in private browsers. */ }}
function freshProfile(name='Jogador'){return{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,name,progress:{},difficulty:{}};}
let profiles=read('t-escalas-profiles-v1',[]);
if(!Array.isArray(profiles))profiles=[];
profiles=profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').map(p=>({...p,name:p.name.slice(0,32),progress:p.progress&&typeof p.progress==='object'?p.progress:{},difficulty:p.difficulty&&typeof p.difficulty==='object'?p.difficulty:{}}));
if(!profiles.length)profiles=[freshProfile()];
let activeId=read('t-escalas-active-v1',profiles[0].id);
if(!profiles.some(p=>p.id===activeId))activeId=profiles[0].id;
let soundOn=read('t-escalas-sound-v1',true)!==false;
const profile=()=>profiles.find(p=>p.id===activeId)||profiles[0];
function saveProfiles(){store('t-escalas-profiles-v1',profiles);store('t-escalas-active-v1',activeId);}
function progress(category){return Math.min(phaseCounts[category],Math.max(0,Number(profile().progress[category])||0));}
function difficulty(category){const d=profile().difficulty[category];return Number.isInteger(d)&&d>=0&&d<4?d:0;}
function timeLabel(seconds){const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function showScene(name){
  if(name!=='game'){clearInterval(loopId);loopId=null;stopAudio(false);}
  scene=name;for(const id of scenes)$('scene-'+id).hidden=id!==name;
  $('footer-profile').disabled=name==='game';
  document.title=`${{menu:'T-Escalas',career:'Exercícios · T-Escalas',practice:'Praticar · T-Escalas',briefing:'Preparado? · T-Escalas',game:'Identifique a escala · T-Escalas',results:'Resultado · T-Escalas',lessons:'Fundamentos · T-Escalas',about:'Sobre · T-Escalas'}[name]}`;
  if(name==='career')renderCareer();if(name==='lessons')loadLessons();
  window.scrollTo({top:0,behavior:'instant'});
}
function abandonGame(destination='menu'){
  if(session?.status==='playing'&&scene==='game'&&!confirm('Encerrar este exercício? O resultado desta rodada não será salvo.'))return;
  session=null;showScene(destination);
}
$('home').addEventListener('click',()=>abandonGame());
$('menu-career').addEventListener('click',()=>showScene('career'));
$('menu-practice').addEventListener('click',()=>showScene('practice'));
$('menu-lessons').addEventListener('click',()=>showScene('lessons'));
$('about').addEventListener('click',()=>abandonGame('about'));
$('help').addEventListener('click',()=>{$('help-dialog').showModal();});
$('close-help').addEventListener('click',()=>$('help-dialog').close());
$('logo').addEventListener('load',()=>{$('logo-fallback').hidden=true;});
$('logo').addEventListener('error',()=>{$('logo').hidden=true;$('logo-fallback').hidden=false;});
if($('logo').complete&&$('logo').naturalWidth)$('logo-fallback').hidden=true;

function renderProfileLabels(){for(const id of ['profile-name','footer-profile-name'])$(id).textContent=profile().name;}
function renderProfiles(){
  renderProfileLabels();$('profile-error').textContent='';
  $('profiles-list').replaceChildren(...profiles.map(p=>{
    const row=document.createElement('div');row.className='profile-row'+(p.id===activeId?' active':'');
    const select=document.createElement('button');select.type='button';select.className='profile-select';select.textContent=p.name;
    const detail=document.createElement('small');detail.textContent=`${Object.values(p.progress).reduce((a,n)=>a+(Number(n)||0),0)} fases concluídas`;select.append(detail);
    select.addEventListener('click',()=>{activeId=p.id;saveProfiles();renderProfiles();renderCareer();$('profiles-dialog').close();});
    const reset=document.createElement('button');reset.type='button';reset.className='quiet-button';reset.textContent='Limpar progresso';reset.setAttribute('aria-label',`Limpar progresso de ${p.name}`);
    reset.addEventListener('click',()=>{if(!confirm(`Apagar todo o progresso de ${p.name}?`))return;p.progress={};p.difficulty={};saveProfiles();renderProfiles();renderCareer();});
    const remove=document.createElement('button');remove.type='button';remove.className='quiet-button';remove.textContent='Excluir';remove.setAttribute('aria-label',`Excluir perfil ${p.name}`);
    remove.addEventListener('click',()=>{if(!confirm(`Excluir o perfil ${p.name} e todo o seu progresso?`))return;profiles=profiles.filter(item=>item.id!==p.id);if(!profiles.length)profiles=[freshProfile()];if(p.id===activeId)activeId=profiles[0].id;saveProfiles();renderProfiles();renderCareer();});
    row.append(select,reset,remove);return row;
  }));
}
function openProfiles(){if(scene==='game')return;$('profiles-dialog').showModal();renderProfiles();}
$('profile-open').addEventListener('click',openProfiles);$('footer-profile').addEventListener('click',openProfiles);
$('close-profiles').addEventListener('click',()=>$('profiles-dialog').close());
$('profile-form').addEventListener('submit',event=>{
  event.preventDefault();const name=$('new-profile').value.trim();
  if(!name){$('profile-error').textContent='Digite um nome para o perfil.';return;}
  if(profiles.length>=20){$('profile-error').textContent='Você já tem 20 perfis. Exclua um antes de criar outro.';return;}
  if(profiles.some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){$('profile-error').textContent='Este nome já existe. Escolha outro nome.';return;}
  const next=freshProfile(name);profiles.push(next);activeId=next.id;saveProfiles();$('new-profile').value='';renderProfiles();renderCareer();$('profiles-dialog').close();
});
for(const id of ['career-category','practice-category'])$(id).replaceChildren(...categoryKeys.map(key=>{const option=document.createElement('option');option.value=key;option.textContent=CATEGORIES[key].name;return option;}));
$('career-difficulty').replaceChildren(...DIFFICULTIES.map((name,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=name;return option;}));
function renderCareer(){
  const category=$('career-category').value||categoryKeys[0];
  $('career-difficulty').value=String(difficulty(category));
  $('category-cards').replaceChildren(...categoryKeys.map((key,i)=>{
    const button=document.createElement('button');button.type='button';button.className='category-card'+(key===category?' active':'');button.setAttribute('aria-pressed',String(key===category));
    const icon=document.createElement('span');icon.className='category-icon';icon.setAttribute('aria-hidden','true');icon.textContent=['♫','♭','𝄞','♯'][i];
    const title=document.createElement('strong');title.textContent=CATEGORIES[key].name;
    const detail=document.createElement('small');detail.textContent=`${progress(key)} de ${phaseCounts[key]} fases · ${DIFFICULTIES[difficulty(key)]}`;
    const track=document.createElement('div');track.className='progress-track';const fill=document.createElement('div');fill.className='progress-fill';fill.style.width=`${progress(key)/phaseCounts[key]*100}%`;track.append(fill);
    button.append(icon,title,detail,track);button.addEventListener('click',()=>{$('career-category').value=key;$('career-phase').value='0';renderCareer();});return button;
  }));
  const unlocked=progress(category), oldPhase=Number($('career-phase').value)||0;
  $('career-phase').replaceChildren(...Array.from({length:phaseCounts[category]},(_,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`Fase ${i+1}${i>unlocked?' · bloqueada':''}`;option.disabled=i>unlocked;return option;}));
  $('career-phase').value=String(Math.min(oldPhase,unlocked,phaseCounts[category]-1));
  renderPhases();renderCareerRules();renderProfileLabels();
}
function renderPhases(){
  const category=$('career-category').value,chosen=Number($('career-phase').value),unlocked=progress(category);
  $('phase-grid').replaceChildren(...Array.from({length:phaseCounts[category]},(_,i)=>{
    const button=document.createElement('button');button.type='button';button.className='phase-button'+(i===chosen?' active':'');button.disabled=i>unlocked;button.setAttribute('aria-pressed',String(i===chosen));
    button.textContent=i>unlocked?'🔒':i<unlocked?'✓ '+(i+1):String(i+1);button.setAttribute('aria-label',`Fase ${i+1}${i>unlocked?', bloqueada':i<unlocked?', concluída':''}`);
    button.addEventListener('click',()=>{$('career-phase').value=String(i);renderPhases();renderCareerRules();});return button;
  }));
}
function getCareerConfig(){return phaseConfig($('career-category').value,Number($('career-difficulty').value),Number($('career-phase').value));}
function renderCareerRules(){const config=getCareerConfig();$('career-description').textContent=`Fase ${config.phase+1} · ${config.auditory?'Auditivo':'Visual'} · ${config.timeLimit} segundos · meta: ${config.targetHits} ${config.targetHits===1?'acerto':'acertos'} · limite: ${config.maxErrors} erros consecutivos`;$('start-career').disabled=Number($('career-phase').value)>progress(config.category);}
$('career-category').addEventListener('change',()=>{$('career-phase').value='0';renderCareer();});
$('career-phase').addEventListener('change',()=>{renderPhases();renderCareerRules();});
$('career-difficulty').addEventListener('change',()=>{
  const category=$('career-category').value,next=Number($('career-difficulty').value),prev=difficulty(category);
  if(next!==prev&&progress(category)>0&&!confirm('Mudar a dificuldade reinicia as fases desta família, como no aplicativo original. Continuar?')){$('career-difficulty').value=String(prev);return;}
  if(next!==prev)profile().progress[category]=0;
  profile().difficulty[category]=next;saveProfiles();$('career-phase').value='0';renderCareer();
});
function prepare(config){
  pendingConfig={...config};lastConfig={...config};
  $('briefing-mode').textContent=config.practice?'PRATICAR':`FASE ${config.phase+1} · ${DIFFICULTIES[config.difficulty]}`;
  $('briefing-title').textContent=CATEGORIES[config.category].name;
  $('briefing-rules').textContent=config.practice?'Pratique sem limite de tempo. Encerre quando quiser para ver seu resultado.':`Você tem ${config.timeLimit} segundos para conseguir ${config.targetHits} ${config.targetHits===1?'acerto':'acertos'}. ${config.maxErrors} erros consecutivos encerram o exercício.`;
  $('briefing-instruction').textContent=config.auditory?'Escute a escala e escolha seu tipo. Use Ouvir escala para repetir.':'Observe a pauta e escolha o tipo da escala. Você também pode ouvi-la.';
  showScene('briefing');
}
$('start-career').addEventListener('click',()=>prepare(getCareerConfig()));
$('practice-form').addEventListener('submit',event=>{event.preventDefault();const auditory=new FormData($('practice-form')).get('mode')==='auditory';prepare({...phaseConfig($('practice-category').value,0,0),practice:true,timeLimit:Infinity,maxErrors:Infinity,targetHits:0,root:null,rootIndex:-1,wrongPause:2,types:CATEGORIES[$('practice-category').value].types,auditory,direction:$('practice-direction').value,clef:auditory?'treble':$('practice-clef').value,showHints:false,showDegrees:false});});
document.querySelectorAll('[name="mode"]').forEach(input=>input.addEventListener('change',()=>{$('practice-clef').closest('.field').hidden=input.checked&&input.value==='auditory';}));
$('begin-game').addEventListener('click',async()=>{
  if(!pendingConfig)return;const config={...pendingConfig};pendingConfig=null;
  session=createSession(config);showScene('game');$('footer-profile').disabled=true;renderQuestion();updateScore();
  if(config.auditory)playScaleAudio();
  loopId=setInterval(gameLoop,100);
});
function gameLoop(){
  if(!session||scene!=='game')return;
  tick(session);updateScore();
  if(session.status!=='playing'){finish();return;}
  if(session.answered&&session.feedback&&Date.now()>=session.feedback.readyAt){nextQuestion(session);renderQuestion();if(session.config.auditory)playScaleAudio();}
}
function updateScore(){if(!session)return;$('timer-label').textContent=session.config.practice?'Tempo decorrido':'Tempo restante';$('timer').textContent=timeLabel(session.config.practice?session.elapsed:Math.ceil(session.remaining));$('timer').classList.toggle('urgent',!session.config.practice&&session.remaining<10);$('hits').textContent=session.hits;$('errors').textContent=session.misses;$('target').textContent=session.config.targetHits;$('target-box').hidden=session.config.practice;}
function scaleName(type){return SCALES[type]?.name||type;}
function renderQuestion(){
  stopAudio(false);const {config,question}=session;
  $('game-mode').textContent=config.practice?'PRATICAR':`EXERCÍCIOS · FASE ${config.phase+1}`;
  $('game-title').textContent=CATEGORIES[config.category].name;
  $('end-game').textContent=config.practice?'Finalizar':'Encerrar';
  $('question-count').textContent=`ESCALA ${session.hits+session.misses+1}`;
  $('question-instruction').textContent=config.auditory?'Qual escala você ouviu?':'Qual é o tipo desta escala?';
  $('scale-staff').hidden=!!config.auditory;$('auditory-prompt').hidden=!config.auditory;
  $('scale-staff').innerHTML=config.auditory?'':scaleSvg(question.notes,config.clef,question.direction||config.direction,config.showDegrees);
  if(config.showHints&&!config.auditory){const hint=document.createElement('p');hint.className='scale-hint';hint.textContent=`Notas: ${orderedNotes(question.notes,question.direction||config.direction).map(noteLabel).join(' · ')}`;$('scale-staff').append(hint);}
  $('answers').replaceChildren(...question.options.map(type=>{
    const button=document.createElement('button');button.type='button';button.className='answer-button';button.dataset.type=type;button.textContent=scaleName(type);
    button.addEventListener('click',()=>submitAnswer(type));return button;
  }));
  $('feedback').textContent='';$('next-question').hidden=true;
}
function submitAnswer(type){
  if(!session||session.answered||session.status!=='playing')return;
  const result=answer(session,type);if(result.correct===null){finish();return;}
  stopAudio(false);
  for(const button of $('answers').children){button.disabled=true;if(button.dataset.type===result.expected)button.classList.add('correct');if(!result.correct&&button.dataset.type===type)button.classList.add('wrong');}
  $('feedback').textContent=result.correct?'Correto! Muito bem.':`Resposta correta: ${scaleName(result.expected)}. ${!session.config.practice?`Erros consecutivos: ${session.streak+1} de ${session.config.maxErrors}.`:''}`;
  updateScore();
  // Retain visible feedback before reporting a streak defeat.
  if(session.status!=='playing'){clearInterval(loopId);loopId=null;setTimeout(()=>{if(scene==='game')finish();},1000);}
}
$('end-game').addEventListener('click',()=>{
  if(!session)return;
  if(!session.config.practice&&!confirm('Encerrar o exercício antes do fim? Esta fase não será concluída.'))return;
  tick(session);session.status='finished';finish();
});
function finish(){
  if(!session)return;const {config,hits,misses,elapsed,status}=session;
  const won=status==='won';
  if(won){profile().progress[config.category]=Math.max(progress(config.category),config.phase+1);saveProfiles();}
  $('footer-profile').disabled=false;
  $('results-eyebrow').textContent=config.practice?'PRÁTICA CONCLUÍDA':`EXERCÍCIOS · ${CATEGORIES[config.category].name}`;
  $('result-icon').textContent=won?'♜':config.practice?'♫':'♮';
  $('result-title').textContent=won?'Muito bem!':config.practice?'Bom estudo!':status==='finished'?'Exercício encerrado':'Tente novamente';
  $('result-description').textContent=won?(config.phase+1<phaseCounts[config.category]?`Fase ${config.phase+1} concluída. A próxima fase está liberada para ${profile().name}.`:'Todas as fases desta família foram concluídas. Experimente outra dificuldade!'):config.practice?'Cada escala reconhecida é um passo para ouvir melhor.':status==='finished'?'Você pode retornar e praticar novamente.':session.streak>=config.maxErrors?'O limite de erros consecutivos foi atingido. Pratique e volte para uma nova tentativa.':`O tempo acabou. A meta era ${config.targetHits} acertos.`;
  $('result-stats').replaceChildren(...[['Tempo',timeLabel(elapsed)],['Acertos',hits],['Erros',misses]].map(([label,value])=>{const div=document.createElement('div');div.textContent=label;const strong=document.createElement('strong');strong.textContent=value;div.prepend(strong);return div;}));
  $('results-back').textContent=config.practice?'Voltar à prática':'Voltar às fases';showScene('results');
}
$('play-again').addEventListener('click',()=>prepare(lastConfig));
$('results-back').addEventListener('click',()=>showScene(lastConfig?.practice?'practice':'career'));

function renderSound(){$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Desativar sons':'Ativar sons');$('sound').title=soundOn?'Sons ativados':'Sons desativados';}
$('sound').addEventListener('click',()=>{soundOn=!soundOn;store('t-escalas-sound-v1',soundOn);renderSound();if(!soundOn){stopAudio();if(scene==='game'&&session?.config.auditory)$('audio-status').textContent='Som desativado. Ative o botão ♫ e toque em Ouvir escala para responder.';backgroundAudio.pause();$('background-pause').textContent='Reproduzir';}else if($('background-music').value!=='off')startBackground();});
function stopAudio(announce=true){audioToken++;clearTimeout(audioTimer);for(const voice of voices){try{voice.stop();}catch{}}voices=[];$('play-scale').removeAttribute('aria-busy');$('audio-status').textContent=announce?'Reprodução interrompida.':'';}
async function playScaleAudio(){
  stopAudio(false);if(!session)return;if(!soundOn){$('audio-status').textContent='Ative o som no botão ♫ para ouvir a escala.';return;}
  const token=audioToken,AudioClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioClass){$('audio-status').textContent='Áudio interativo indisponível neste navegador.';return;}
  try{
    audioContext??=new AudioClass();await audioContext.resume();if(token!==audioToken)return;
    const notes=orderedNotes(session.question.notes,session.question.direction||session.config.direction);
    const start=audioContext.currentTime+.035,step=.28;
    for(const [i,note] of notes.entries()){
      const when=start+i*step,frequency=440*2**((note.midi-69)/12);
      for(const [multiple,level] of [[1,.2],[2,.05],[3,.018]]){
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=frequency*multiple;
        gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+.012);gain.gain.exponentialRampToValueAtTime(.0001,when+.55);
        oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(when);oscillator.stop(when+.6);voices.push(oscillator);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }
    $('play-scale').setAttribute('aria-busy','true');$('audio-status').textContent='Escala em reprodução…';
    audioTimer=setTimeout(()=>{if(token!==audioToken)return;voices=[];$('play-scale').removeAttribute('aria-busy');$('audio-status').textContent='Reprodução concluída. Você pode ouvir novamente.';},(notes.length*step+.4)*1000);
  }catch{$('audio-status').textContent='Toque em Ouvir escala para iniciar o áudio.';}
}
$('play-scale').addEventListener('click',playScaleAudio);$('stop-audio').addEventListener('click',()=>stopAudio());

async function loadLessons(){
  if(lessons){renderLesson(lessonKey||Object.keys(lessons)[0]);return;}
  $('lesson-content').textContent='Carregando fundamentos…';
  try{const response=await fetch('./assets/lessons.json');if(!response.ok)throw new Error();lessons=await response.json();
    if(Array.isArray(lessons))lessons=Object.fromEntries(lessons.map((l,i)=>[l.id||String(i),l]));
    $('lesson-nav').replaceChildren(...Object.entries(lessons).map(([key,lesson])=>{const button=document.createElement('button');button.type='button';button.textContent=lesson.title;button.dataset.lesson=key;button.addEventListener('click',()=>renderLesson(key));return button;}));renderLesson(Object.keys(lessons)[0]);
  }catch{const p=document.createElement('p');p.textContent='Não foi possível carregar os fundamentos.';const button=document.createElement('button');button.type='button';button.className='glossy small';button.textContent='Tentar novamente';button.addEventListener('click',loadLessons);$('lesson-content').replaceChildren(p,button);}
}
function renderLesson(key){
  if(!lessons?.[key])return;lessonKey=key;const lesson=lessons[key],content=$('lesson-content');
  for(const button of $('lesson-nav').children){const active=button.dataset.lesson===key;button.classList.toggle('active',active);button.setAttribute('aria-current',String(active));}
  const title=document.createElement('h2');title.textContent=lesson.title;content.replaceChildren(title);
  const segments=lesson.segments||[...(lesson.paragraphs||[]).map(text=>({type:'text',text})),...(lesson.images||[]).map(src=>({type:'image',src}))];let count=0;
  for(const segment of segments){
    if(segment.type==='image'){count++;const link=document.createElement('a');link.href=segment.src;link.target='_blank';link.rel='noopener noreferrer';link.title='Abrir diagrama em tamanho original';link.setAttribute('aria-label',`Abrir diagrama ${count} de ${lesson.title} em tamanho original (nova aba)`);const image=document.createElement('img');image.src=segment.src;image.alt=`Diagrama ${count}: ${lesson.title}`;image.loading='lazy';link.append(image);content.append(link);}
    else{const node=document.createElement(segment.type==='heading'?'h3':'p');node.textContent=segment.text;content.append(node);}
  }
}
const backgroundAudio=new Audio();backgroundAudio.loop=true;backgroundAudio.volume=.12;
async function startBackground(){if(!soundOn){$('background-status').textContent='Ative o som no botão ♫ para ouvir a trilha.';return;}try{await backgroundAudio.play();$('background-pause').textContent='Pausar';$('background-status').textContent='';}catch{$('background-status').textContent='Toque em Reproduzir para iniciar a trilha.';$('background-pause').textContent='Reproduzir';}}
$('background-music').addEventListener('change',()=>{backgroundAudio.pause();const value=$('background-music').value;$('background-pause').disabled=value==='off';$('background-status').textContent='';if(value==='off'){backgroundAudio.removeAttribute('src');backgroundAudio.load();$('background-pause').textContent='Reproduzir';return;}backgroundAudio.src=`./assets/audio/${value==='menu'?'menu':'bg'+value}.ogg`;startBackground();});
$('background-pause').addEventListener('click',()=>{if(backgroundAudio.paused)startBackground();else{backgroundAudio.pause();$('background-pause').textContent='Reproduzir';}});
backgroundAudio.addEventListener('error',()=>{$('background-status').textContent='Não foi possível carregar esta trilha.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudio(false);backgroundAudio.pause();$('background-pause').textContent='Reproduzir';}});
saveProfiles();renderProfileLabels();renderCareer();renderSound();showScene('menu');
