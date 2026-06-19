import React, { useEffect, useState } from 'react';
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
import { NumberOrder } from './NumberOrder';
import { MathBlitz } from './MathBlitz';
import { SimonSays } from './SimonSays';
import { WhackMole } from './WhackMole';
import { BalloonPop } from './BalloonPop';
import { FlipDuo } from './FlipDuo';
import { GravityFlip } from './GravityFlip';
import { CatchDrop } from './CatchDrop';
import { SpeedSort } from './SpeedSort';
import { RunnerJump } from './RunnerJump';
import { OddColor } from './OddColor';
import { CoinGrab } from './CoinGrab';
import { TowerStack } from './TowerStack';
import { BlockFill } from './BlockFill';
import { ColorOrder } from './ColorOrder';
import { NumberFlash } from './NumberFlash';
import { Zigzag } from './Zigzag';
import { ChainBoom } from './ChainBoom';
import { Balance } from './Balance';
import { AngleGuess } from './AngleGuess';
import { WaveMatch } from './WaveMatch';
import { DotChain } from './DotChain';
import { SpotChange } from './SpotChange';
import { logEvent } from '../store/events';
import { syncEvent } from '../lib/recommender/eventSync';
import { recordSessionSignal } from '../lib/recommender/session';
import { ResumePrompt } from '../components/ResumePrompt';
import { useAchievements } from '../store/useAchievements';
import { useUser } from '../store/useUser';
import { getDailyChallenge } from '../lib/dailyChallenge';
import { supabase } from '../lib/supabase';

type Props = {
  game: Game;
  onBack: () => void;
};

export function GamePlayScreen({ game, onBack }: Props) {
  const { getResumeFor, clearResume, report } = useAchievements();
  const { user } = useUser();
  const resume = getResumeFor(game.id);
  const [decision, setDecision] = useState<'pending' | 'continue' | 'restart'>(resume ? 'pending' : 'restart');
  const [initialLevel, setInitialLevel] = useState<number>(1);

  useEffect(() => {
    report({ type: 'play-start', game });
    if (!resume) {
      setDecision('restart');
      setInitialLevel(1);
    } else {
      setDecision('pending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.slug]);

  if (decision === 'pending' && resume) {
    return (
      <ResumePrompt
        game={game}
        resumeLevel={resume.level}
        bestLevel={resume.best_level}
        bestScore={resume.best_score}
        onContinue={() => { setInitialLevel(resume.level); setDecision('continue'); }}
        onRestart={async () => { await clearResume(game.id); setInitialLevel(1); setDecision('restart'); }}
      />
    );
  }

  // Wraps each game's onComplete: logs event + dispatches achievement signal.
  // The level number lives in `meta.level` (every game now passes it).
  const onComplete = (won: boolean, score: number, meta?: Record<string, number>) => {
    logEvent({ type: 'complete', gameId: game.id, meta: { won: won ? 1 : 0, score, ...meta } });
    // Persist to Supabase for the recommender, and feed the in-session re-ranker
    // (a win is a strong positive; the play itself was already counted on launch).
    syncEvent('complete', game.id, { won: won ? 1 : 0, score });
    if (won) recordSessionSignal(game, 'complete');
    if (meta?.level !== undefined) {
      report({ type: 'level-complete', game, level: meta.level, passed: won, score, meta });
    }
    // If this is the daily challenge game, push to the daily leaderboard —
    // but only if it beats the user's existing best for today.
    const daily = getDailyChallenge();
    if (won && user && game.id === daily.game.id && score > 0) {
      (async () => {
        try {
          const { data: existing } = await supabase
            .from('daily_scores')
            .select('score')
            .eq('user_id', user.id)
            .eq('day', daily.day)
            .eq('game_id', game.id)
            .maybeSingle();
          const prev = (existing as any)?.score ?? 0;
          if (score > prev) {
            const { error } = await supabase
              .from('daily_scores')
              .upsert(
                { user_id: user.id, day: daily.day, game_id: game.id, score },
                { onConflict: 'user_id,day,game_id' }
              );
            if (error && __DEV__) console.warn('daily score upsert failed', error.message);
          }
        } catch (e) {
          if (__DEV__) console.warn('daily score check failed', e);
        }
      })();
    }
  };

  const props = { game, onBack, onComplete, initialLevel };
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
    case 'number-order': return <NumberOrder {...props} />;
    case 'math-blitz': return <MathBlitz {...props} />;
    case 'simon-says': return <SimonSays {...props} />;
    case 'whack-mole': return <WhackMole {...props} />;
    case 'balloon-pop': return <BalloonPop {...props} />;
    case 'flip-duo': return <FlipDuo {...props} />;
    case 'gravity-flip': return <GravityFlip {...props} />;
    case 'catch-drop': return <CatchDrop {...props} />;
    case 'speed-sort': return <SpeedSort {...props} />;
    case 'runner-jump': return <RunnerJump {...props} />;
    case 'odd-color': return <OddColor {...props} />;
    case 'coin-grab': return <CoinGrab {...props} />;
    case 'tower-stack': return <TowerStack {...props} />;
    case 'block-fill': return <BlockFill {...props} />;
    case 'color-order': return <ColorOrder {...props} />;
    case 'number-flash': return <NumberFlash {...props} />;
    case 'zigzag': return <Zigzag {...props} />;
    case 'chain-boom': return <ChainBoom {...props} />;
    case 'balance': return <Balance {...props} />;
    case 'angle-guess': return <AngleGuess {...props} />;
    case 'wave-match': return <WaveMatch {...props} />;
    case 'dot-chain': return <DotChain {...props} />;
    case 'spot-change': return <SpotChange {...props} />;
    default: return <TapRush {...props} />;
  }
}
