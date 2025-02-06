/**
 * Module: Spelling Flashcard Game
 * --------------------------------
 * This module implements a flashcard style word-spelling game with a Wordle twist.
 * A randomly picked word is shown on a flashcard for a few seconds before hiding.
 * The user then has to spell the word by tapping/clicking letters on a virtual keyboard.
 * - Correct letters (in the correct position) are shown in green.
 * - Incorrect letters appear in gray.
 *
 * The game supports multiple attempts (up to 6 tries) before revealing the correct answer.
 * On a correct guess, a celebratory animation (confetti) is displayed.
 *
 * The module uses ES6, React hooks, and react-confetti.
 */

import React, { useState, useEffect } from "react";
import Confetti from "react-confetti";
import successSound from "./success.mp3"; // Added import for the success sound
// Import word pairs from the JSON file instead of inline constant
import wordPairs from "./spelling-flash-card-words.json";
import "./spelling-flash-card.css"; // <-- NEW: Import the CSS for flip animations

// Removed inline WORD_PAIRS constant
// const WORD_PAIRS = [
//   { word: 'flower', tip: 'Spell "flower" as "flow" + "er". Don\'t mix it with "flour" (the powder).' },
//   ...
// ];

// Function to speak the word (used during the spelling prompt)
const speakWord = (word: string) => {
  if (word && "speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
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
      return `The letter at position ${i + 1} should be "${
        expected[i]
      }" but you typed "${input[i]}".`;
    }
  }
  return "There might be an issue with the letter order.";
};

// Celebration component providing a confetti animation.
const Celebration = () => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

// Virtual Keyboard component
const VirtualKeyboard = ({ 
  onLetterClick, 
  onBackspace, 
  onSubmit, 
  currentGuess,
  disabled 
}: { 
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  currentGuess: string;
  disabled: boolean;
}) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="virtual-keyboard">
      {alphabet.map((letter) => (
        <button
          key={letter}
          className="letter-key"
          onClick={() => onLetterClick(letter)}
          disabled={disabled}
        >
          {letter}
        </button>
      ))}
      <button
        className="letter-key backspace"
        onClick={onBackspace}
        disabled={disabled || currentGuess.length === 0}
      >
        ←
      </button>
      <button
        className="letter-key submit"
        onClick={onSubmit}
        disabled={disabled || currentGuess.length === 0}
      >
        Submit
      </button>
    </div>
  );
};

// Current guess row component
const CurrentGuessRow = ({ 
  word, 
  currentGuess 
}: { 
  word: string;
  currentGuess: string;
}) => {
  return (
    <div className="current-guess-row">
      {Array.from({ length: word.length }).map((_, index) => (
        <div
          key={index}
          className={`guess-box ${
            index === currentGuess.length ? 'active' : ''
          } ${index < currentGuess.length ? 'filled' : ''}`}
        >
          {index < currentGuess.length ? currentGuess[index] : ''}
        </div>
      ))}
    </div>
  );
};

// Add this new component for flying letters
const FlyingLetter = ({ 
  letter, 
  startPosition, 
  onAnimationEnd 
}: { 
  letter: string;
  startPosition: { x: number; y: number };
  onAnimationEnd: () => void;
}) => {
  return (
    <div
      className="letter-fly"
      style={{
        left: startPosition.x,
        top: startPosition.y,
        color: '#4a5568' // Updated to match guess box text color
      }}
      onAnimationEnd={onAnimationEnd}
    >
      {letter}
    </div>
  );
};

// Main flashcard game component
const SpellingFlashCardGame = () => {
  // State variables for current word, flashcard display, user guess, history, and status messaging.
  const [currentWord, setCurrentWord] = useState<string>("");
  const [flipped, setFlipped] = useState<boolean>(false); // false = show front, true = show back
  const [animateSuccess, setAnimateSuccess] = useState<boolean>(false);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [attempt, setAttempt] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<
    { name: string; score: number }[]
  >([]);
  const [message, setMessage] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  // NEW: Add state for dynamic difficulty
  const [currentTargetLength, setCurrentTargetLength] = useState<number>(4);
  const [successfulCount, setSuccessfulCount] = useState<number>(0);

  // Add flying letters state
  const [flyingLetters, setFlyingLetters] = useState<Array<{
    letter: string;
    position: { x: number; y: number };
    id: string;
  }>>([]);

  const MAX_ATTEMPTS = 3;

  // Initialize a new round upon component mount.
  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load leaderboard from localStorage on component mount
  useEffect(() => {
    const storedLeaderboard = localStorage.getItem("leaderboard");
    if (storedLeaderboard) {
      setLeaderboard(JSON.parse(storedLeaderboard));
    }
  }, []);

  // Updated: Select a random word based on the current target length.
  const startNewRound = () => {
    // Filter available word pairs by the target word length.
    let availablePairs = wordPairs.filter(
      (pair) => pair.word.length === currentTargetLength
    );
    // Fallback to words with closest length if no exact match found.
    if (availablePairs.length === 0) {
      const diffs = wordPairs.map((pair) =>
        Math.abs(pair.word.length - currentTargetLength)
      );
      const minDiff = Math.min(...diffs);
      availablePairs = wordPairs.filter(
        (pair) => Math.abs(pair.word.length - currentTargetLength) === minDiff
      );
    }
    const randomPair =
      availablePairs[Math.floor(Math.random() * availablePairs.length)];
    setCurrentWord(randomPair.word);

    // Reset flip state, countdown, guess history, attempt and message for the new round.
    setFlipped(false);
    setCountdown(5);
    setCurrentGuess("");
    setGuessHistory([]);
    setAttempt(0);
    setMessage("");
  };

  // Countdown effect: When flashcard is visible, start a 5-second countdown.
  useEffect(() => {
    if (!flipped) {
      const intervalId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [flipped]);

  // When countdown reaches 0, flip the card and play the word's pronunciation.
  useEffect(() => {
    if (!flipped && countdown <= 0) {
      setFlipped(true);
      speakWord(currentWord);
    }
  }, [countdown, flipped, currentWord]);

  // Updated handleGuessSubmit to remove form event
  const handleGuessSubmit = () => {
    if (!currentWord) return;

    // Get the positions of the current guess boxes for the animation
    const guessBoxes = document.querySelectorAll('.guess-box');
    const positions = Array.from(guessBoxes).map(box => {
      const rect = box.getBoundingClientRect();
      return {
        x: rect.left + (rect.width / 2) - 15, // Center the flying letter
        y: rect.top + (rect.height / 2) - 15
      };
    });

    // Create flying letters
    const letters = currentGuess.split('');
    const flyingLetters = letters.map((letter, index) => ({
      letter,
      position: positions[index],
      id: `${letter}-${index}-${Date.now()}`
    }));

    // Set flying letters state
    setFlyingLetters(flyingLetters);

    // Clear flying letters after animation
    setTimeout(() => {
      setFlyingLetters([]);
    }, 1000);

    if (currentGuess.toLowerCase() === currentWord.toLowerCase()) {
      // Calculate points: each incorrect guess deducts 20 from 100 points
      const roundScore = Math.max(100 - attempt * 30, 0);
      setScore((prev) => prev + roundScore);
      setGuessHistory([...guessHistory, currentGuess]);
     // setMessage(`Excellent spelling! 🎉 You earned ${roundScore} points.`);
      new Audio(successSound).play();

      // Update success count and increase difficulty if needed
      setSuccessfulCount((prevCount) => {
        const newCount = prevCount + 1;
        if (newCount === 4) {
          setCurrentTargetLength((prevLength) => prevLength + 1);
          return 0; // reset counter after 4 successes
        }
        return newCount;
      });

      // Trigger success animation before starting the next round
      setAnimateSuccess(true);
      setTimeout(() => {
        setAnimateSuccess(false);
        setShowCelebration(true);
        setTimeout(() => {
          startNewRound();
        }, 2000);
      }, 600);
    } else {
      const newAttempt = attempt + 1;
      setGuessHistory([...guessHistory, currentGuess]);
      setAttempt(newAttempt);
      if (newAttempt >= MAX_ATTEMPTS) {
        setMessage(`Game Over! The correct word was "${currentWord}". Final score: ${score}`);
        setGameOver(true);
        checkAndPromptHighScore();
      } else {
       // setMessage('Not quite, try again!');
      }
    }
    setCurrentGuess('');
  };

  // New handlers for virtual keyboard
  const handleLetterClick = (letter: string) => {
    if (currentGuess.length < currentWord.length) {
      setCurrentGuess(prev => prev + letter);
    }
  };

  const handleBackspace = () => {
    setCurrentGuess(prev => prev.slice(0, -1));
  };

  // Checks if the final score qualifies for the leaderboard and, if so, prompts for the player's name.
  const checkAndPromptHighScore = () => {
    const qualifies =
      leaderboard.length < 5 ||
      (leaderboard.length > 0 &&
        score > Math.min(...leaderboard.map((e) => e.score)));
    if (qualifies) {
      setShowNamePrompt(true);
    }
  };

  // Handles submission of a new high score entry.
  const handleSubmitHighScore = () => {
    const name = playerName.trim();
    if (!name) return;
    const newEntry = { name, score };
    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem("leaderboard", JSON.stringify(updatedLeaderboard));
    setShowNamePrompt(false);
  };

  // Resets the game for a new session.
  const resetGame = () => {
    setScore(0);
    setGameOver(false);
    setPlayerName("");
    setShowNamePrompt(false);
    startNewRound();
  };

  // Renders a row for a guess with each cell showing feedback:
  // Green if the letter is correct, gray if incorrect, or empty if not guessed.
  const renderGuessRow = (guess: string) => {
    const totalCells = Math.max(currentWord.length, guess.length);
    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalCells }).map((_, index) => {
          const expectedLetter = index < currentWord.length ? currentWord[index] : null;
          const guessedLetter = guess[index] || "";
          let cellClass = "";
          if (expectedLetter !== null) {
            if (!guessedLetter) {
              cellClass = "bg-red-500 text-white";
            } else if (guessedLetter.toLowerCase() === expectedLetter.toLowerCase()) {
              cellClass = "bg-green-500 text-white";
            } else {
              cellClass = "bg-gray-300 text-black";
            }
          } else {
            // Extra letters beyond expected word length
            cellClass = "bg-gray-300 text-black";
          }
          return (
            <div key={index} className={`w-10 h-10 flex items-center justify-center border ${cellClass}`}>{guessedLetter.toUpperCase()}</div>
          );
        })}
      </div>
    );
  };

  // Renders an empty row (for the remaining attempts)
  const renderEmptyRow = () => {
    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length: currentWord.length }).map((_, index) => (
          <div
            key={index}
            className="w-10 h-10 flex items-center justify-center border bg-white"
          >
            &nbsp;
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-pink-100 to-blue-200 p-8">
      {/* Flying letters */}
      {flyingLetters.map(({ letter, position, id }) => (
        <FlyingLetter
          key={id}
          letter={letter}
          startPosition={position}
          onAnimationEnd={() => {
            setFlyingLetters(prev => prev.filter(l => l.id !== id));
          }}
        />
      ))}
      
      <div className="flex justify-between items-start max-w-6xl mx-auto mb-8">
        {/* Left side: Leaderboard */}
        <div className="w-1/4 bg-white rounded-xl shadow-rainbow p-6 animate-float">
          <h2 className="text-2xl font-bold text-purple-600 mb-4">🏆 Champions</h2>
          <ul className="space-y-2">
            {leaderboard.map((entry, index) => (
              <li key={index} className="border-b border-purple-100 py-2 flex justify-between items-center">
                <span className="font-bold text-purple-700">{entry.name}</span>
                <span className="text-pink-500 font-bold">{entry.score}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Center: Main game content */}
        <div className="w-2/4 px-8">
          <h1 className="text-4xl font-bold mb-8 text-center text-purple-700 text-glow">
            ✨ Spelling Magic ✨
          </h1>
          <div
            className={`flip-card-container ${
              animateSuccess ? "animate-success" : ""
            }`}
          >
            <div className={`flip-card ${flipped ? "flipped" : ""}`}>
              {/* Front of the card: Flashcard view */}
              <div className="flip-card-front bg-white p-8 rounded-lg shadow-lg text-center">
                <p className="mt-4 mb-4 text-xl">Memorize the word!</p>
                <h2 className="text-6xl font-bold uppercase">{currentWord}</h2>
                <p className="mt-2 text-2xl font-bold">{countdown}</p>
              </div>
              {/* Back of the card: Spelling view */}
              <div className="flip-card-back bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Spell the word</h2>
                <button
                  type="button"
                  onClick={() => speakWord(currentWord)}
                  title="Replay pronunciation"
                  className="mb-4 text-blue-500 hover:underline"
                >
                  Replay pronunciation
                </button>
                <div className="space-y-2 mb-4">
                  {guessHistory.map((guess, index) => (
                    <div key={index}>{renderGuessRow(guess)}</div>
                  ))}
                  {Array.from({ length: MAX_ATTEMPTS - guessHistory.length }).map(
                    (_, idx) => (
                      <div key={idx}>{renderEmptyRow()}</div>
                    )
                  )}
                </div>
                {message && <p className="mb-2 text-lg">{message}</p>}
                {!gameOver && attempt < MAX_ATTEMPTS && (
                  <div className="flex flex-col items-center gap-4">
                    <CurrentGuessRow
                      word={currentWord}
                      currentGuess={currentGuess}
                    />
                    <VirtualKeyboard
                      onLetterClick={handleLetterClick}
                      onBackspace={handleBackspace}
                      onSubmit={handleGuessSubmit}
                      currentGuess={currentGuess}
                      disabled={gameOver}
                    />
                  </div>
                )}

                {gameOver && (
                  <div className="mt-4 p-4 border rounded bg-red-100">
                    <h2 className="text-2xl font-bold">Game Over!</h2>
                    <p>Your final score is {score}.</p>
                    {showNamePrompt && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Enter your name"
                          className="border rounded px-3 py-2"
                        />
                        <button
                          onClick={handleSubmitHighScore}
                          className="ml-2 bg-green-500 text-white px-4 py-2 rounded"
                        >
                          Submit Score
                        </button>
                      </div>
                    )}
                    <button
                      onClick={resetGame}
                      className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Restart Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Score */}
        <div className="w-1/4 bg-white rounded-xl shadow-rainbow p-6 animate-float">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-purple-600 mb-2">Your Score</h2>
            <div className="text-4xl font-bold text-pink-500 animate-pulse">
              {score}
            </div>
          </div>
        </div>
      </div>
      {showCelebration && <Celebration />}
    </div>
  );
};

export default SpellingFlashCardGame;
