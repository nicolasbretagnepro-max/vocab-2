import { SessionQueueItem, WordEntry, WordProgress } from '../types/vocab';

export const ROUTINE_MAIN_UNITS = 12;
export const ROUTINE_RETRY_UNITS = 2;
export const validDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function exerciseCost(item: Pick<SessionQueueItem,'exerciseType'>): number {
  if(item.exerciseType==='pair-matching')return 4;
  return ['typing-strict','typing-hinted','syllable-builder','paronym-duel'].includes(item.exerciseType)?2:1;
}
export function sortDueWords(words: WordEntry[], progress: Record<string,WordProgress>): WordEntry[] {
  const date=(value: unknown)=>validDay(value)?value:'0000-00-00';
  return [...words].sort((a,b)=>date(progress[a.word]?.lastReviewedDate).localeCompare(date(progress[b.word]?.lastReviewedDate)) ||
    date(progress[a.word]?.nextReviewDate).localeCompare(date(progress[b.word]?.nextReviewDate)) || a.word.localeCompare(b.word,'fr'));
}
export interface ReviewJob { word: WordEntry; items: SessionQueueItem[]; difficult: boolean; }
export function selectReviewJobs(jobs: ReviewJob[], budget: number): ReviewJob[] {
  const result: ReviewJob[]=[], picked=new Set<ReviewJob>();
  const cost=(job:ReviewJob)=>job.items.reduce((n,q)=>n+exerciseCost(q),0);
  const take=(job:ReviewJob)=>{if(!picked.has(job)&&cost(job)<=budget){result.push(job);picked.add(job);budget-=cost(job);return true;}return false;};
  const oldest=jobs.find(j=>cost(j)<=budget);if(oldest)take(oldest);
  let priorityBudget=Math.floor(budget/3);
  for(const job of jobs){if(job.difficult&&!picked.has(job)&&cost(job)<=priorityBudget&&take(job))priorityBudget-=cost(job);}
  for(const job of jobs)take(job);
  return result;
}
