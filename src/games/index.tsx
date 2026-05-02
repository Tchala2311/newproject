import React from 'react';
import { Game } from '../data/games';
import { ColorFlood } from './ColorFlood';
import { TapRush } from './TapRush';
import { WordBlast } from './WordBlast';
import { StackIt } from './StackIt';
import { MergeWave } from './MergeWave';
import { PerfectCircle } from './PerfectCircle';
import { Reflex333 } from './Reflex333';
import { ColorSnipe } from './ColorSnipe';
import { SwipeSnake } from './SwipeSnake';
import { WaterSort } from './WaterSort';
import { logEvent } from '../store/events';

type Props = {
  game: Game;
  onBack: () => void;
};

export function GamePlayScreen({ game, onBack }: Props) {
  const onComplete = (won: boolean, score: number) => {
    logEvent({ type: 'complete', gameId: game.id, meta: { won: won ? 1 : 0, score } });
  };
  const props = { game, onBack, onComplete };
  switch (game.slug) {
    case 'color-flood': return <ColorFlood {...props} />;
    case 'tap-rush': return <TapRush {...props} />;
    case 'word-blast': return <WordBlast {...props} />;
    case 'stack-it': return <StackIt {...props} />;
    case 'merge-wave': return <MergeWave {...props} />;
    case 'perfect-circle': return <PerfectCircle {...props} />;
    case 'reflex-333': return <Reflex333 {...props} />;
    case 'color-snipe': return <ColorSnipe {...props} />;
    case 'swipe-snake': return <SwipeSnake {...props} />;
    case 'water-sort': return <WaterSort {...props} />;
    default: return <TapRush {...props} />;
  }
}
