import { afterEach, expect, it, vi } from 'vitest';
import words from '../src/data/words.json';
import { buildDailyRoutineQueue, updateWordProgressOnAnswer } from '../src/services/srsEngine';
import { WordProgress } from '../src/types/vocab';
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('keeps a stable workload through 90 days of real SRS progression, absence and mistakes',()=>{
  vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(.4);
  const progress:Record<string,WordProgress>={};let learned=0,pauses=0;
  for(let day=0;day<90;day++){
    const date=new Date(Date.UTC(2026,10,26+day,12));vi.setSystemTime(date);
    if(day>=12&&day<=18)continue;
    const today=date.toISOString().slice(0,10),before=JSON.stringify(progress);
    const plan=buildDailyRoutineQueue(words,progress,2,today);
    const futureAtPlanning=new Set(Object.values(progress).filter(p=>p.nextReviewDate&&p.nextReviewDate>today).map(p=>p.word));
    expect(plan.plannedUnits).toBeLessThanOrEqual(12);expect(plan.newWordsCount).toBeLessThanOrEqual(2);
    expect(JSON.stringify(progress)).toBe(before);learned+=plan.newWordsCount;if(!plan.newWordsCount)pauses++;
    for(const item of plan.queue){
      for(const target of item.reviewTargets||[item]){
        const p=progress[target.wordEntry.word];
        // A failed discovery pass can schedule tomorrow while later passes of that same
        // learning cycle are still planned today. Eligibility is checked at planning time.
        expect(futureAtPlanning.has(target.wordEntry.word)).toBe(false);
        const ok=(day+target.wordEntry.word.length)%11!==0;
        progress[target.wordEntry.word]=updateWordProgressOnAnswer(p,target.wordEntry.word,ok,target,0,today);
      }
    }
  }
  expect(learned).toBeGreaterThan(20);expect(pauses).toBeGreaterThan(0);
  expect(Object.values(progress).some(p=>p.level>=4)).toBe(true);
});
