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
import { BeatTap } from './BeatTap';
import { EmojiMatch } from './EmojiMatch';
import { NervePulse } from './NervePulse';
import { FallingLetters } from './FallingLetters';
import { Connect } from './Connect';
import { Slide15 } from './Slide15';
import { Wordle5 } from './Wordle5';
import { Picross } from './Picross';
import { TetrisMini } from './TetrisMini';
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
    case 'beat-tap': return <BeatTap {...props} />;
    case 'emoji-match': return <EmojiMatch {...props} />;
    case 'nerve-pulse': return <NervePulse {...props} />;
    case 'falling-letters': return <FallingLetters {...props} />;
    case 'connect': return <Connect {...props} />;
    case 'slide-15': return <Slide15 {...props} />;
    case 'wordle-5': return <Wordle5 {...props} />;
    case 'picross': return <Picross {...props} />;
    case 'tetris-mini': return <TetrisMini {...props} />;
    default: return <TapRush {...props} />;
  }
}
