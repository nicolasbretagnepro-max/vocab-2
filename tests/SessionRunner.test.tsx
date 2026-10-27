import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionRunner } from '../src/components/session/SessionRunner';
import { SessionQueueItem, WordEntry } from '../src/types/vocab';

// JSDOM has no canvas; confetti is decorative and does not drive the session.
vi.mock('canvas-confetti', () => ({ default: () => undefined }));

const exulter: WordEntry = {
  word: 'Exulter', nature: 'verbe', definition_courte: 'Manifester une joie intense.',
  definition: 'Exprimer une très grande joie.', example_1: 'Les joueurs exultent après la victoire.',
  example_cloze_1: 'Les joueurs […] après la victoire.', example_2: 'Elle exulte de joie.',
  example_cloze_2: 'Elle […] de joie.',
};
const apaiser: WordEntry = {
  ...exulter, word: 'Apaiser', definition_courte: 'Ramener au calme.',
  definition: 'Rendre moins agité.', example_1: 'Il apaise les tensions.',
  example_cloze_1: 'Il […] les tensions.',
};
const item = (id: string, exerciseType: SessionQueueItem['exerciseType'], wordEntry = exulter): SessionQueueItem =>
  ({ id, exerciseType, wordEntry, targetLevel: 2, targetStep: 0 });
function mount(queue: SessionQueueItem[]) {
  const onUpdate = vi.fn(), onFinish = vi.fn();
  render(<SessionRunner title="Routine du Jour" initialQueue={queue} allWords={[exulter, apaiser]}
    progressMap={{}} onUpdateWordProgress={onUpdate} onFinishSession={onFinish}
    onCancel={() => {}} onToggleFavorite={() => {}} />);
  return { onUpdate, onFinish };
}
async function settle(ms = 2000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('routine transitions', () => {
  it('mounts the next exercise even when animation frames are suspended', async () => {
    mount([item('1', 'discovery'), item('2', 'qcm-word-to-def', apaiser)]);
    await settle();
    // A suspended/resumed mobile page must not need an exit-animation callback to mount its next question.
    fireEvent.click(screen.getByRole('button', { name: "J'ai mémorisé ce mot" }));
    expect(screen.queryByRole('heading', { name: 'Apaiser' })).not.toBeNull();
  });

  it('a rapid double tap validates only once and does not skip a word', async () => {
    const { onUpdate } = mount([item('1', 'discovery'), item('2', 'discovery', apaiser), item('3', 'qcm-word-to-def')]);
    await settle();
    const button = screen.getByRole('button', { name: "J'ai mémorisé ce mot" });
    act(() => { button.click(); button.click(); });
    await settle();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Apaiser' })).not.toBeNull();
  });

  it('shows the correction and then the next exercise after a wrong answer', async () => {
    mount([item('1', 'qcm-word-to-def'), item('2', 'discovery', apaiser)]);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: apaiser.definition_courte }));
    await settle();
    expect(screen.queryByText('Fiche de correction')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    await settle();
    expect(screen.queryByRole('heading', { name: 'Apaiser' })).not.toBeNull();
  });

  it('never renders only the header when a composite exercise lacks its payload', async () => {
    mount([item('1', 'paronym-duel')]);
    await settle();
    expect(screen.queryByRole('button', { name: /Passer sans notation/ })).not.toBeNull();
  });

  it('keeps a forgotten final flashcard available for its promised retry', async () => {
    mount([item('1', 'flashcard-recall')]);
    await settle();
    fireEvent.click(screen.getByText('Formulez mentalement la définition…'));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /Oublié/ }));
    await settle();
    expect(screen.queryByText('Formulez mentalement la définition…')).not.toBeNull();
  });

  it('an empty queue has a way back instead of a blank screen', async () => {
    mount([]);
    await settle();
    expect(screen.queryByText('Aucun exercice à réaliser dans cette séance.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Retour à l.accueil/ })).not.toBeNull();
  });

  it('an unavailable question can be passed without changing learning or XP', async () => {
    const { onUpdate, onFinish } = mount([item('1', 'pair-matching')]);
    fireEvent.click(screen.getByRole('button', { name: /Passer sans notation/ }));
    fireEvent.click(screen.getByRole('button', { name: /Retour à l.accueil/ }));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith(0, 0);
  });

  it('a second typing question starts with a fresh input', async () => {
    mount([item('1', 'typing-strict'), item('2', 'typing-strict', apaiser)]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'exulter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider', exact: true }));
    await settle();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(/Ramener au calme/)).not.toBeNull();
  });

  it.each<SessionQueueItem['exerciseType']>([
    'discovery', 'qcm-word-to-def', 'qcm-def-to-word', 'qcm-cloze-1', 'qcm-cloze-2',
    'syllable-builder', 'typing-hinted', 'typing-strict', 'pair-matching', 'paronym-duel', 'flashcard-recall',
  ])('renders an interactive exercise for %s', async (type) => {
    mount([{ ...item('1', type), pairWords: [exulter, apaiser], duelOpponent: apaiser }]);
    await settle();
    const buttons = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label') !== 'Quitter la session');
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Cette question est indisponible')).toBeNull();
  });
});
