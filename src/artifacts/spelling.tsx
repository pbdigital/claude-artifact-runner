import React, { useState, useEffect } from 'react';
import { Star, Award, Volume2, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import successSound from './success.mp3'; // Added import for the success sound
// Import word pairs from the JSON file instead of inline constant
import wordPairs from './words.json';
// Constant to define how many words will be used in the game
const TOTAL_WORDS = 6;

// Removed inline WORD_PAIRS constant
// const WORD_PAIRS = [
//   { word: 'flower', tip: 'Spell "flower" as "flow" + "er". Don\'t mix it with "flour" (the powder).' },
//   ...
// ];

// Create pairs of cards (word-word pairs) using a random subset of words
const createCards = () => {
  // Randomly select TOTAL_WORDS words from the available wordPairs
  const selectedWords = [...wordPairs].sort(() => Math.random() - 0.5).slice(0, TOTAL_WORDS);
  return selectedWords.flatMap(({ word, tip }) => [
    { id: `${word}-1`, word, tip, isFlipped: false, isMatched: false },
    { id: `${word}-2`, word, tip, isFlipped: false, isMatched: false }
  ]).sort(() => Math.random() - 0.5);
};

// New function to handle speech synthesis for pronunciation
const speakWord = (word: string) => {
  // Check if word is provided and browser supports speech synthesis
  if (word && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; // set the language as needed
    window.speechSynthesis.speak(utterance);
  }
};

// New helper function to generate detailed error feedback for spelling attempts
/**
 * Generates detailed error feedback for a misspelled word.
 *
 * Compares the expected word with the user input and provides specific feedback.
 * If lengths differ, it indicates a letter count mismatch; otherwise, it points out the first incorrect letter.
 *
 * @param expected - The correct word expected.
 * @param input - The user-provided word.
 * @returns A string with detailed feedback.
 */
const getSpellingErrorFeedback = (expected: string, input: string): string => {
  if (input.length !== expected.length) {
    return `Your word has ${input.length} letters, but it should have ${expected.length}.`;
  }
  for (let i = 0; i < expected.length; i++) {
    if (expected[i].toLowerCase() !== input[i].toLowerCase()) {
      return `The letter at position ${i + 1} should be "${expected[i]}" but you typed "${input[i]}".`;
    }
  }
  return "There might be an issue with the letter order.";
};

// Updated Celebration component using react-confetti for a more dynamic effect.
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

const SpellingMemoryGame = () => {
  const [cards, setCards] = useState(createCards());
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [spellingInput, setSpellingInput] = useState('');
  const [currentWord, setCurrentWord] = useState(null);
  const [showSpelling, setShowSpelling] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // New state variables for additional scoring metrics
  const [attemptCount, setAttemptCount] = useState(0); // Total match attempts (every two flipped cards)
  const [incorrectAttempts, setIncorrectAttempts] = useState(0); // Mismatched attempts
  const [spellingAttempts, setSpellingAttempts] = useState(0); // Incorrect spelling attempts

  // Handle card click
  const handleCardClick = (clickedCard) => {
    if (
      isChecking ||
      flippedCards.length === 2 ||
      clickedCard.isFlipped ||
      clickedCard.isMatched ||
      showSpelling
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
      setAttemptCount(prev => prev + 1); // Increment the total number of attempts
      const [firstCard, secondCard] = flippedCards;

      if (firstCard.word === secondCard.word) {
        setMessage('Match found! Now spell the word!');
        setCurrentWord(firstCard.word);
        setShowSpelling(true);
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setMessage('');
        }, 2000);
      } else {
        setMessage('Try again!');
        setIncorrectAttempts(prev => prev + 1); // Increment incorrect attempts on mismatch
        setTimeout(() => {
          setCards(
            cards.map((card) =>
              card.id === firstCard.id || card.id === secondCard.id
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
          setMessage('');
        }, 1000);
      }
    }
  }, [flippedCards]);

  // Handle spelling submission
  const handleSpellingSubmit = (e) => {
    e.preventDefault();
    if (spellingInput.toLowerCase().trim() === currentWord.toLowerCase().trim()) {
      new Audio(successSound).play(); // Play the success sound on correct spelling
      setMessage('Excellent spelling! 🌟');
      setScore(score + 10);
      setMatchedPairs(matchedPairs + 1);
      setCards(
        cards.map((card) =>
          card.word === currentWord ? { ...card, isMatched: true } : card
        )
      );
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setMessage('');
      }, 2000);
    } else {
      // Generate detailed error feedback when spelling is incorrect
      setSpellingAttempts((prev) => prev + 1); // Increment incorrect spacing attempt count
      const feedback = getSpellingErrorFeedback(currentWord, spellingInput);
      setMessage(`Incorrect! ${feedback} Please try again! 📝`);
      setSpellingInput('');
      return;
    }

    setSpellingInput('');
    setFlippedCards([]);
    setIsChecking(false);
    setShowSpelling(false);
    setCurrentWord(null);

    // Update winning condition using the length of wordPairs from JSON
    if (matchedPairs + 1 === TOTAL_WORDS) {
      setTimeout(() => {
        setMessage('🎉 Congratulations! You won the game! 🎉');
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }, 500);
    }
  };

  // Reset game
  const resetGame = () => {
    setCards(createCards());
    setFlippedCards([]);
    setMatchedPairs(0);
    setIsChecking(false);
    setSpellingInput('');
    setCurrentWord(null);
    setShowSpelling(false);
    setScore(0);
    setMessage('');
    setShowCelebration(false);
    // Reset additional metrics
    setAttemptCount(0);
    setIncorrectAttempts(0);
    setSpellingAttempts(0);
  };

  // New useEffect to auto-play word pronunciation when the spelling prompt appears
  useEffect(() => {
    if (showSpelling && currentWord) {
      speakWord(currentWord);
    }
  }, [showSpelling, currentWord]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-8">
      {showCelebration && <Celebration />}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-4">
            Indiana's Spelling Memory Game ✨
          </h1>
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">Score: {score}</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">
                Matches: {matchedPairs}/{TOTAL_WORDS}
              </span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-purple-600 font-bold">
                Attempts: {attemptCount} / Incorrect: {incorrectAttempts}
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

        {showSpelling && (
          <div className="bg-white rounded-lg p-6 mb-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold text-purple-600 mb-4">
              Time to spell: {currentWord}
              <button
                type="button"
                onClick={() => speakWord(currentWord)}
                title="Replay pronunciation"
                className="ml-2 focus:outline-none"
              >
                <Volume2 className="w-6 h-6 inline" />
              </button>
            </h2>
            <p className="text-purple-500 mb-4">
              Say the word out loud, then type it below!
            </p>
            <div className="mt-4 mb-4 text-purple-600">
              Tip: {wordPairs.find(pair => pair.word === currentWord)?.tip}
            </div>
            <form onSubmit={handleSpellingSubmit} className="flex flex-col items-center gap-4">
              <input
                type="text"
                value={spellingInput}
                onChange={(e) => setSpellingInput(e.target.value)}
                className="px-4 py-2 border-2 border-purple-300 rounded-lg text-lg w-64 focus:outline-none focus:border-purple-500"
                placeholder="Type the word here..."
                autoFocus
              />
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Check Spelling
                </button>
              </div>
            </form>
            {/* Display spelling error attempts if any */}
            {spellingAttempts > 0 && (
              <p className="mt-4 text-red-500">
                Spelling Errors: {spellingAttempts}
              </p>
            )}
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
                    <div className="text-white text-4xl">❓</div>
                  </div>
                </div>

                {/* Card Front */}
                <div
                  className="absolute w-full h-full"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="w-full h-full bg-white rounded-xl shadow-lg flex items-center justify-center p-4">
                    <span className="text-2xl font-bold text-purple-600">
                      {card.word}
                    </span>
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

export default SpellingMemoryGame;