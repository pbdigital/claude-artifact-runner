import  { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import Confetti from 'react-confetti';
import successSound from './success.mp3';
// Import homophone pairs from the JSON file
import homophonePairs from './homophones.json';

interface Card {
  id: string;
  word: string;
  tip: string;
  pair: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface CurrentPair {
  first: Card;
  second: Card;
}

const TOTAL_PAIRS = 4; // Number of homophone pairs to use in each game

const createCards = (): Card[] => {
  // Randomly select TOTAL_PAIRS pairs from the available homophonePairs
  const selectedPairs = [...homophonePairs]
    .sort(() => Math.random() - 0.5)
    .slice(0, TOTAL_PAIRS);

  // Create cards for both words in each pair
  return selectedPairs.flatMap((pair) => [
    { 
      id: `${pair.word1}-1`, 
      word: pair.word1, 
      tip: pair.tip1, 
      pair: pair.word2,
      isFlipped: false, 
      isMatched: false 
    },
    { 
      id: `${pair.word2}-2`, 
      word: pair.word2, 
      tip: pair.tip2, 
      pair: pair.word1,
      isFlipped: false, 
      isMatched: false 
    }
  ]).sort(() => Math.random() - 0.5);
};

// Speech synthesis function
const speakWord = (word: string) => {
  if (word && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

// Celebration component remains the same
const Celebration = () => {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <Confetti
        width={dimensions.width}
        height={dimensions.height}
        recycle={false}
        numberOfPieces={300}
        tweenDuration={1000}
        initialVelocityY={25}
        initialVelocityX={25}
        gravity={1.0}
        wind={0.05}
        opacity={0.9}
        confettiSource={{
          x: dimensions.width / 2,
          y: 0,
          w: 0,
          h: 0,
        }}
      />
    </div>
  );
};

const HomophoneMemoryGame = () => {
  const [cards, setCards] = useState<Card[]>(createCards());
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [currentPair, setCurrentPair] = useState<CurrentPair | null>(null);
  const [showTip, setShowTip] = useState(false);
  
  // Handle card click
  const handleCardClick = (clickedCard: Card) => {

    if (
      isChecking ||
      flippedCards.length === 2 ||
      clickedCard.isFlipped ||
      clickedCard.isMatched
    ) {
      return;
    }

    const newCards = cards.map((card) =>
      card.id === clickedCard.id ? { ...card, isFlipped: true } : card
    );
    setCards(newCards);
    setFlippedCards([...flippedCards, clickedCard]);
  };

  // Check for matches
  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      setAttemptCount(prev => prev + 1);
      const [firstCard, secondCard] = flippedCards;

      if (firstCard.word === secondCard.pair || firstCard.pair === secondCard.word) {
        setMessage('Correct! These words sound the same but have different meanings!');
        setScore(score + 10);
        setCurrentPair({ first: firstCard, second: secondCard });
        setShowTip(true);
        setShowCelebration(true);
        setMatchedPairs(prev => prev + 1);
        
        // Mark cards as matched
        setCards(cards.map(card => 
          card.id === firstCard.id || card.id === secondCard.id
            ? { ...card, isMatched: true }
            : card
        ));

        // Play success sound
        new Audio(successSound).play();

        setTimeout(() => {
          setShowCelebration(false);
          setFlippedCards([]);
          setIsChecking(false);
          setMessage('');
        }, 3000);
      } else {
        setMessage('Not a match! These words sound different.');
        setIncorrectAttempts(prev => prev + 1);
        setTimeout(() => {
          setCards(cards.map(card => 
            card.id === firstCard.id || card.id === secondCard.id
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
          setIsChecking(false);
          setMessage('');
        }, 2000);
      }
    }
  }, [flippedCards]);

  // Check for game completion
  useEffect(() => {
    if (matchedPairs === TOTAL_PAIRS) {
      setMessage('🎉 Congratulations! You\'ve matched all the homophones! 🎉');
      setShowCelebration(true);
    }
  }, [matchedPairs]);

  const resetGame = () => {
    setCards(createCards());
    setFlippedCards([]);
    setMatchedPairs(0);
    setIsChecking(false);
    setScore(0);
    setMessage('');
    setShowCelebration(false);
    setAttemptCount(0);
    setIncorrectAttempts(0);
    setCurrentPair(null);
    setShowTip(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-8">
      {incorrectAttempts}
      {showCelebration && <Celebration />}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-4">
            Homophone Memory Game 🎵
          </h1>
          <p className="text-lg text-purple-500 mb-4">
            Match words that sound the same but have different meanings!
          </p>
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">Score: {score}</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">
                Matches: {matchedPairs}/{TOTAL_PAIRS}
              </span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">
                Attempts: {attemptCount}
              </span>
            </div>
          </div>
          <div className="h-8 mb-4">
            {message && (
              <div className="text-lg font-bold text-purple-700">
                {message}
              </div>
            )}
          </div>
        </div>

        {showTip && currentPair && (
          <div className="bg-white rounded-lg p-6 mb-8 shadow-lg">
            <h3 className="text-xl font-bold text-purple-600 mb-4">
              How to use these words:
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="font-bold mb-2">{currentPair.first.word}:</p>
                <p>{currentPair.first.tip}</p>
                <button
                  onClick={() => speakWord(currentPair.first.word)}
                  className="mt-2 text-purple-600"
                >
                  <Volume2 className="w-5 h-5 inline" />
                </button>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="font-bold mb-2">{currentPair.second.word}:</p>
                <p>{currentPair.second.tip}</p>
                <button
                  onClick={() => speakWord(currentPair.second.word)}
                  className="mt-2 text-purple-600"
                >
                  <Volume2 className="w-5 h-5 inline" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{ perspective: '1000px' }}
              className={`aspect-w-3 aspect-h-4 ${
                !card.isFlipped && !card.isMatched
                  ? 'cursor-pointer transform hover:scale-105 transition-transform'
                  : ''
              }`}
            >
              <div
                className="relative w-full h-48 transition-transform duration-500 transform-gpu"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Card Back */}
                <div
                  className="absolute w-full h-full"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl shadow-lg flex items-center justify-center">
                    <div className="text-white text-4xl">🔊</div>
                  </div>
                </div>

                {/* Card Front */}
                <div
                  className="absolute w-full h-full"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="w-full h-full bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-4">
                    <span className="text-2xl font-bold text-purple-600 mb-2">
                      {card.word}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(card.word);
                      }}
                      className="text-purple-500"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={resetGame}
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomophoneMemoryGame;