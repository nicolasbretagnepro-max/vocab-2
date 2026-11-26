import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SessionRunner } from '../src/components/session/SessionRunner';
import { SessionQueueItem, WordEntry, WordProgress } from '../src/types/vocab';
vi.mock('canvas-confetti',()=>({default:()=>undefined}));
const words:WordEntry[]=Array.from({length:6},(_,i)=>({word:`Mot ${i}`,nature:'nom',definition_courte:`Sens ${i}`,definition:`Définition ${i}`,
  example_1:`Voici Mot ${i}.`,example_cloze_1:'Voici […].',example_2:`Un Mot ${i}.`,example_cloze_2:'Un […].'}));
const item=(i:number):SessionQueueItem=>({id:`q${i}`,wordEntry:words[i],exerciseType:'qcm-word-to-def',targetLevel:2,targetStep:0});
const initial=Object.fromEntries(words.map(w=>[w.word,{word:w.word,level:2,step:0,nextReviewDate:'2026-11-25',lastReviewedDate:'2026-11-20',successCount:3,errorCount:0,favorite:false}])) as Record<string,WordProgress>;
function mount(queue:SessionQueueItem[]){const update=vi.fn(),finish=vi.fn();render(<SessionRunner title="Routine courte" initialQueue={queue} allWords={words}
  progressMap={initial} onUpdateWordProgress={update} onFinishSession={finish} onCancel={()=>{}} onToggleFavorite={()=>{}}
  shortRoutine={{maxUnits:14,retryUnits:2}}/>);return {update,finish};}
async function settle(ms=2000){await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});}
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));vi.spyOn(document,'hidden','get').mockReturnValue(false);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});

it('ends after at most two extra retries even when every answer is wrong',async()=>{
  const {update}=mount(words.map((_,i)=>item(i)));
  for(let i=0;i<8;i++){
    const title=screen.getByRole('heading').textContent!;
    const wrong=words.find(w=>w.word!==title&&screen.queryByRole('button',{name:w.definition_courte,exact:true}));
    fireEvent.click(screen.getByRole('button',{name:wrong!.definition_courte,exact:true}));await settle();
    fireEvent.click(screen.getByRole('button',{name:'Continuer la séance',exact:true}));await settle();
  }
  expect(screen.queryByRole('heading',{name:'Bravo !'})).not.toBeNull();expect(update).toHaveBeenCalledTimes(8);
});

it('offers finishing at five active minutes but still grades the current exercise',async()=>{
  const {update,finish}=mount([item(0),item(1)]);
  await settle(300000);
  fireEvent.click(screen.getByRole('button',{name:'Terminer après cet exercice'}));
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:words[0].definition_courte,exact:true}));await settle();
  fireEvent.click(screen.getByRole('button',{name:/Retour à l.accueil/}));
  expect(update).toHaveBeenCalledTimes(1);expect(finish).toHaveBeenCalledWith(15,1,true);
});

it('does not count background time toward the five-minute offer',async()=>{
  mount([item(0)]);vi.mocked(Object.getOwnPropertyDescriptor(document,'hidden')!.get!).mockReturnValue(true);
  fireEvent(document,new Event('visibilitychange'));await settle(600000);
  expect(screen.queryByRole('button',{name:'Terminer après cet exercice'})).toBeNull();
});

it('records a pair target once on its first association and leaves the support target untouched',async()=>{
  const group:SessionQueueItem={...item(0),exerciseType:'pair-matching',pairWords:words.slice(0,4),reviewTargets:words.slice(0,4).map((_,i)=>item(i))};
  const {update,finish}=mount([group]);
  fireEvent.click(screen.getByRole('button',{name:'Mot 0 nom',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Sens 1',exact:true}));
  expect(update).toHaveBeenCalledTimes(1);expect(update.mock.calls[0][0]).toBe('Mot 0');expect(update.mock.calls[0][1].errorCount).toBe(1);
  expect(update.mock.calls[0][1].nextReviewDate).toBe('2026-11-27');
  expect(screen.queryByText('1 / 4 tentés · 0 réussis')).not.toBeNull();
  await settle();expect((screen.getByRole('button',{name:'Mot 0 nom',exact:true}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button',{name:'Sens 1',exact:true}) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));
  expect(finish).toHaveBeenCalledWith(0,1,false);
});

it('grades all four correct pairs through their original review descriptors',async()=>{
  const group:SessionQueueItem={...item(0),exerciseType:'pair-matching',pairWords:words.slice(0,4),reviewTargets:words.slice(0,4).map((_,i)=>item(i))};
  const {update}=mount([group]);
  for(let i=0;i<4;i++){fireEvent.click(screen.getByRole('button',{name:`Mot ${i} nom`,exact:true}));fireEvent.click(screen.getByRole('button',{name:`Sens ${i}`,exact:true}));}
  await settle();expect(update).toHaveBeenCalledTimes(4);
  expect(update.mock.calls.every(([,p])=>p.nextReviewDate==='2026-11-28'&&p.step===1)).toBe(true);
});

it('a duel records only its recognition target before the correction is acknowledged',async()=>{
  vi.spyOn(Math,'random').mockReturnValue(.8);
  const q:SessionQueueItem={...item(0),exerciseType:'paronym-duel',duelOpponent:words[1],reviewTargets:[{...item(0),exerciseType:'qcm-def-to-word'}]};
  const {update,finish}=mount([q]);
  fireEvent.click(screen.getAllByRole('button',{name:'Mot 1',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:'Valider le duel',exact:true}));
  expect(update).toHaveBeenCalledTimes(1);expect(update.mock.calls[0][0]).toBe('Mot 0');expect(update.mock.calls[0][1].errorCount).toBe(1);
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));expect(finish).toHaveBeenCalledWith(0,1,false);
});

it('saves a submitted answer before exit and rejects its delayed transition',async()=>{
  const {update,finish}=mount([item(0)]);
  fireEvent.click(screen.getByRole('button',{name:words[0].definition_courte,exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));await settle();
  expect(update).toHaveBeenCalledTimes(1);expect(finish).toHaveBeenCalledWith(15,1,false);
});

it('records a wrong typed answer immediately even when exiting before correction',async()=>{
  const {update,finish}=mount([{...item(0),exerciseType:'typing-strict'}]);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'inconnu'}});
  fireEvent.click(screen.getByRole('button',{name:'Valider',exact:true}));
  expect(update).toHaveBeenCalledTimes(1);expect(update.mock.calls[0][1].errorCount).toBe(1);
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));await settle();
  expect(update).toHaveBeenCalledTimes(1);expect(finish).toHaveBeenCalledWith(0,1,false);
});

it('records a syllable submission before its delayed feedback completes',async()=>{
  const {update,finish}=mount([{...item(0),exerciseType:'syllable-builder',targetLevel:3}]);
  const chunk=screen.getAllByRole('button').find(b=>b.textContent&&!b.textContent.includes('Valider')&&b.getAttribute('aria-label')!=='Quitter la session')!;
  fireEvent.click(chunk);fireEvent.click(screen.getByRole('button',{name:/Valider «/}));
  expect(update).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));await settle();
  expect(update).toHaveBeenCalledTimes(1);expect(finish.mock.calls[0][1]).toBe(1);
});
