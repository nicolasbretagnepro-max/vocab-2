import { describe, expect, it, vi } from 'vitest';
import { buildDailyRoutineQueue, updateWordProgressOnAnswer } from '../src/services/srsEngine';
import { SessionQueueItem, WordEntry, WordProgress } from '../src/types/vocab';

const day = '2026-11-26';
const words: WordEntry[] = Array.from({length: 780}, (_, i) => ({
  word: `Terme ${String(i).padStart(3, '0')}`, nature: 'nom masculin',
  definition_courte: `Sens ${i}`, definition: `Définition du terme ${i}`,
  example_1: `Voici le terme ${i}.`, example_cloze_1: 'Voici […].',
  example_2: `Je retiens le terme ${i}.`, example_cloze_2: 'Je retiens […].',
}));
const fresh: WordEntry[] = ['Exulter','Malingre','Ressac','Liturgique'].map((word,i) => ({...words[i],word}));
const progress = (w: WordEntry, extra = {}): WordProgress => ({word:w.word,level:2,step:1,
  nextReviewDate:'2026-11-01',lastReviewedDate:'2026-10-01',successCount:5,errorCount:0,favorite:false,...extra});
const targets = (queue: SessionQueueItem[]) => queue.flatMap(q => q.reviewTargets || [q]);
const cost = (q: SessionQueueItem) => q.exerciseType==='pair-matching'?4:
  ['typing-strict','typing-hinted','syllable-builder','paronym-duel'].includes(q.exerciseType)?2:1;

describe('short daily planning', () => {
  it('caps a large due pool without changing the dates of unselected words', () => {
    const p=Object.fromEntries(words.map(w=>[w.word,progress(w)])), before=JSON.stringify(p);
    const plan=buildDailyRoutineQueue(words,p,3 as never,day);
    expect(plan.queue.reduce((n,q)=>n+cost(q),0)).toBeLessThanOrEqual(12);
    expect(plan.reviewWordsCount).toBeLessThanOrEqual(12);
    expect(plan.newWordsCount).toBe(0);expect(JSON.stringify(p)).toBe(before);
    expect(plan.deferredCount).toBe(780-plan.reviewWordsCount);
  });

  it.each([[0,2],[6,2],[7,1],[9,1],[10,0]])('regulates newcomers for %i due units', (count,want) => {
    const p=Object.fromEntries(words.slice(0,count).map(w=>[w.word,progress(w)]));
    const plan=buildDailyRoutineQueue([...words.slice(0,count),...fresh],p,3 as never,day);
    expect(plan.newWordsCount).toBe(want);
    expect(plan.queue.reduce((n,q)=>n+cost(q),0)).toBeLessThanOrEqual(12);
    for(const w of fresh){const passes=plan.queue.filter(q=>q.wordEntry.word===w.word).map(q=>q.passIndex);if(passes.length)expect(passes).toEqual([1,2,3]);}
  });

  it('does not fill a quiet session with future reviews or repeat today newcomers', () => {
    const p=Object.fromEntries(words.slice(0,20).map(w=>[w.word,progress(w,{nextReviewDate:'2027-01-01',introducedOn:day})]));
    const plan=buildDailyRoutineQueue([...words.slice(0,20),...fresh],p,2 as never,day);
    expect(plan.queue).toHaveLength(0);expect(plan.newWordsCount).toBe(0);
  });

  it('keeps whole level-one cycles and does not let one difficult word consume all slots', () => {
    const p=Object.fromEntries(words.slice(0,25).map((w,i)=>[w.word,progress(w,{level:i<5?1:4,isLeech:i===0,consecutiveErrors:i===0?8:0})]));
    const plan=buildDailyRoutineQueue(words.slice(0,25),p,2 as never,day);
    expect(plan.queue.reduce((n,q)=>n+cost(q),0)).toBeLessThanOrEqual(12);
    expect(new Set(targets(plan.queue).map(q=>q.wordEntry.word)).size).toBeGreaterThan(1);
    for(const w of words.slice(0,5)){const passes=plan.queue.filter(q=>q.wordEntry.word===w.word).map(q=>q.passIndex);if(passes.length)expect(passes).toEqual([2,3]);}
  });

  it('recovers invalid due dates and preserves real future dates', () => {
    const p={ [words[0].word]:progress(words[0],{nextReviewDate:'invalid'}), [words[1].word]:progress(words[1],{nextReviewDate:'2027-01-01'}) };
    const selected=targets(buildDailyRoutineQueue(words.slice(0,2),p,2 as never,day).queue).map(q=>q.wordEntry.word);
    expect(selected).toContain(words[0].word);expect(selected).not.toContain(words[1].word);
  });

  it('eventually covers all 780 due words despite permanent errors and repeated arrivals', () => {
    const p=Object.fromEntries(words.map((w,i)=>[w.word,progress(w,{level:i<20?2:4,isLeech:i<20,consecutiveErrors:i<20?4:0})]));
    const covered=new Set<string>();
    for(let d=0;d<240;d++){
      const currentDay=new Date(Date.UTC(2026,10,26+d)).toISOString().slice(0,10);
      const plan=buildDailyRoutineQueue(words,p,2 as never,currentDay);
      expect(plan.queue.reduce((n,q)=>n+cost(q),0)).toBeLessThanOrEqual(12);
      for(const q of targets(plan.queue)){
        covered.add(q.wordEntry.word);const value=p[q.wordEntry.word];
        value.lastReviewedDate=currentDay;
        value.nextReviewDate=new Date(Date.UTC(2026,10,27+d)).toISOString().slice(0,10);
      }
      if(covered.size===780)break;
    }
    expect(covered.size).toBe(780);
  });

  it('covers the oldest words even if sessions stop after the first actual answer', () => {
    const pool=words.slice(0,40),p=Object.fromEntries(pool.map((w,i)=>[w.word,progress(w,{level:i%3===0?1:4,step:i%3===0?2:0,isLeech:i<5})]));
    const covered=new Set<string>();
    for(let d=0;d<60;d++){
      const currentDay=new Date(Date.UTC(2026,10,26+d)).toISOString().slice(0,10);
      const first=buildDailyRoutineQueue(pool,p,2,currentDay).queue[0];
      for(const q of targets([first])){covered.add(q.wordEntry.word);p[q.wordEntry.word].lastReviewedDate=currentDay;}
    }
    expect(covered.size).toBe(40);
  });

  it('introduces a word once and preserves that date on later attempts', () => {
    const item:SessionQueueItem={id:'new',wordEntry:fresh[0],exerciseType:'discovery',targetLevel:1,targetStep:0,passIndex:1};
    const p=updateWordProgressOnAnswer(undefined,fresh[0].word,true,item,0,day);
    expect(p.introducedOn).toBe(day);
    expect(updateWordProgressOnAnswer(p,fresh[0].word,false,{...item,exerciseType:'qcm-word-to-def'},0,'2026-11-27').introducedOn).toBe(day);
  });

  it('substitutes paires and duel only with canonical due targets and known supports', () => {
    const pool=words.slice(0,8),p=Object.fromEntries(pool.map(w=>[w.word,progress(w,{step:0})]));
    const games=new Set<string>();
    for(const currentDay of ['2026-11-26','2026-11-27','2026-11-28']){
      const plan=buildDailyRoutineQueue(pool,p,2,currentDay);
      for(const q of plan.queue.filter(q=>q.reviewTargets)){
        games.add(q.exerciseType);expect(q.reviewTargets?.every(t=>t.exerciseType==='qcm-def-to-word')).toBe(true);
        if(q.exerciseType==='pair-matching')expect(q.reviewTargets).toHaveLength(4);
        if(q.duelOpponent)expect(p[q.duelOpponent.word].level).toBeGreaterThan(0);
      }
    }
    expect(games).toEqual(new Set(['pair-matching','paronym-duel']));
  });
});
