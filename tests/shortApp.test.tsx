import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import words from '../src/data/words.json';
vi.mock('canvas-confetti',()=>({default:()=>undefined}));
beforeEach(()=>{
  localStorage.clear();vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));
  vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}));vi.spyOn(document,'hidden','get').mockReturnValue(false);
});
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
function seed(due:string[]=[]){localStorage.setItem('vocab_srs_progress_v2',JSON.stringify(Object.fromEntries(words.map(w=>[w.word,{word:w.word,level:4,step:0,nextReviewDate:due.includes(w.word)?'2026-11-01':'2027-01-01',lastReviewedDate:'2026-10-01',successCount:8,errorCount:0,favorite:false}]))));}
async function settle(ms=2000){await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});}
it('does not fill an empty routine with future words',()=>{
  seed();render(<App/>);
  expect((screen.getByRole('button',{name:'Révisions à jour'}) as HTMLButtonElement).disabled).toBe(true);
});
it('completes the short daily goal with due words remaining and launches a fresh optional review',async()=>{
  seed(['Exulter','Malingre']);render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Lancer ma routine courte'}));
  await settle(300000);fireEvent.click(screen.getByRole('button',{name:'Terminer après cet exercice'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'exulter'}});fireEvent.click(screen.getByRole('button',{name:'Valider',exact:true}));await settle();
  fireEvent.click(screen.getByRole('button',{name:'Continuer quelques minutes',exact:true}));
  expect(JSON.parse(localStorage.getItem('vocab_user_stats_v2')!).totalXp).toBe(15);
  expect(JSON.parse(localStorage.getItem('vocab_user_stats_v2')!).routineCompletedDate).toBe('2026-11-26');
  expect(screen.queryByRole('textbox')).not.toBeNull();
  const p=JSON.parse(localStorage.getItem('vocab_srs_progress_v2')!);expect(p.Malingre.nextReviewDate).toBe('2026-11-01');
  fireEvent.click(screen.getByRole('button',{name:'Quitter la session'}));
  expect(screen.queryByText('Objectif du jour accompli')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem('vocab_user_stats_v2')!).totalXp).toBe(15);
});

it('refreshes the daily objective when the open app returns on a new date',()=>{
  seed();const p=JSON.parse(localStorage.getItem('vocab_srs_progress_v2')!);p.Exulter.nextReviewDate='2026-11-27';localStorage.setItem('vocab_srs_progress_v2',JSON.stringify(p));
  localStorage.setItem('vocab_user_stats_v2',JSON.stringify({dailyXp:100,dailyXpDate:'2026-11-26',totalXp:100,routineCompletedDate:'2026-11-26',lastActiveDate:'2026-11-26',streak:1}));
  render(<App/>);expect(screen.queryByText('Objectif du jour accompli')).not.toBeNull();
  vi.setSystemTime(new Date('2026-11-27T08:00:00Z'));fireEvent(document,new Event('visibilitychange'));
  expect(screen.queryByText('Objectif du jour accompli')).toBeNull();
  expect((screen.getByRole('button',{name:'Lancer ma routine courte'}) as HTMLButtonElement).disabled).toBe(false);
});

it('saves the completed goal and XP before leaving the recap and survives a reload',async()=>{
  seed(['Exulter']);render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Lancer ma routine courte'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'exulter'}});
  fireEvent.click(screen.getByRole('button',{name:'Valider',exact:true}));await settle();
  expect(screen.queryByRole('heading',{name:'Bravo !'})).not.toBeNull();
  const saved=JSON.parse(localStorage.getItem('vocab_user_stats_v2')||'{}');
  expect(saved.routineCompletedDate).toBe('2026-11-26');expect(saved.totalXp).toBe(15);
  cleanup();render(<App/>);
  expect(screen.queryByText('Objectif du jour accompli')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem('vocab_user_stats_v2')!).totalXp).toBe(15);
});

it.each([2,3])('retains a failed N1 pass %i after the other passes and a next-day reload',async(failedPass)=>{
  seed();const p=JSON.parse(localStorage.getItem('vocab_srs_progress_v2')!);delete p.Exulter;
  localStorage.setItem('vocab_srs_progress_v2',JSON.stringify(p));render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Lancer ma routine courte'}));
  fireEvent.click(screen.getByRole('button',{name:"J'ai mémorisé ce mot"}));
  for(const pass of [2,3]){
    const correct=pass===2?words.find(w=>w.word==='Exulter')!.definition_courte:'Exulter';
    const wrong=words.find(w=>w.word!=='Exulter'&&screen.queryByRole('button',{name:pass===2?w.definition_courte:w.word,exact:true}));
    fireEvent.click(screen.getByRole('button',{name:pass===failedPass?(pass===2?wrong!.definition_courte:wrong!.word):correct,exact:true}));
    await settle();
    if(pass===failedPass){fireEvent.click(screen.getByRole('button',{name:'Continuer la séance',exact:true}));await settle();}
  }
  const saved=JSON.parse(localStorage.getItem('vocab_srs_progress_v2')!);
  expect(saved.Exulter.level).toBe(1);expect(saved.Exulter.step).toBe(failedPass-1);
  expect(saved.Exulter.nextReviewDate).toBe('2026-11-27');
  cleanup();vi.setSystemTime(new Date('2026-11-27T12:00:00Z'));render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Lancer ma routine courte'}));
  expect(screen.queryByRole('button',{name:"J'ai mémorisé ce mot"})).toBeNull();
  expect(screen.queryByText(failedPass===2?'Ancrage • Passe 2/3 (Définition)':'Validation • Passe 3/3 (Contexte)')).not.toBeNull();
});
