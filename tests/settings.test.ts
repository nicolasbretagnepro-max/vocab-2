import { afterEach, expect, it } from 'vitest';
import { decodeBackupString, loadSettings } from '../src/services/storageService';
afterEach(()=>localStorage.clear());
it.each([3,5,7])('migrates the old newcomer setting %i without losing other preferences', value=>{
  localStorage.setItem('vocab_user_settings_v2',JSON.stringify({dailyNewWordsQuota:value,theme:'dark',dailyXpGoal:150}));
  expect(loadSettings()).toEqual({dailyNewWordsQuota:2,theme:'dark',dailyXpGoal:150});
  const backup=decodeBackupString(JSON.stringify({progress:{test:{level:4}},settings:{dailyNewWordsQuota:value,theme:'dark'}}));
  expect(backup.settings.dailyNewWordsQuota).toBe(2);expect(backup.progress.test.level).toBe(4);
});
