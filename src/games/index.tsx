import React, { useCallback } from 'react';
import { Game } from '../data/games';
import { ColorFlood } from './ColorFlood';
import { TapRush } from './TapRush';
import { WordBlast } from './WordBlast';
import { StackIt } from './StackIt';
import { MergeWave } from './MergeWave';
import { logEvent } from '../store/events';
import { useStats } from '../store/useStats';

type Props = {
  game: Game;
  onBack: () => void;
};

export function GamePlayScreen({ game, onBack }: Props) {
  const { refresh } = useStats();

  const onComplete = useCallback(
    (won: boolean, score: number) => {
      logEvent({ type: 'complete', gameId: game.id, meta: { won: won ? 1 : 0, score } });
      // Refresh after the event log debounce fires (~1500ms) so the recommender
      // sees the new completion next time the user is on the feed.
      setTimeout(refresh, 1700);
    },
    [game.id, refresh],
  );

  const props = { game, onBack, onComplete };
  switch (game.id) {
    case 1: return <ColorFlood {...props} />;
    case 2: return <TapRush {...props} />;
    case 3: return <WordBlast {...props} />;
    case 4: return <StackIt {...props} />;
    case 5: return <MergeWave {...props} />;
    default: return <TapRush {...props} />;
  }
}
