/**
 * Module: Spelling Flashcard Game
 * --------------------------------
 * This module implements a flashcard style word-spelling game with a Wordle twist.
 * A randomly picked word is shown on a flashcard for a few seconds before hiding.
 * The user then has to spell the word by tapping/clicking letters on a virtual keyboard.
 * - Correct letters (in the correct position) are shown in green.
 * - Incorrect letters appear in gray.
 *
 * The game supports multiple attempts (up to 3 tries) before revealing the correct answer.
 * On a correct guess, a celebratory animation (confetti) is displayed.
 *
 * The game session now uses a smaller pool of words (10–20 words) and ensures that the child
 * goes through each word only once. If they complete all the words before the session timer expires,
 * the game ends successfully.
 *
 * The module uses ES6, React hooks, and react-confetti.
 */

import { useState, useEffect } from "react";
import Confetti from "react-confetti";
import OpenAI from "openai";
import successSound from "./success.mp3"; // Added import for the success sound
// Import word pairs from the JSON file
import wordPairs from "./spelling-flash-card-words.json";
import "./spelling-flash-card.css"; // <-- NEW: Import the CSS for flip animations

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

// Function to speak the word using OpenAI's TTS
const speakWord = async (word: string) => {
  if (!word) return;
  
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "alloy",
      input: `Spell the word.... "${word}".`,
    });

    const arrayBuffer = await mp3.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    await audio.play();
    
    // Cleanup URL after playing
    audio.onended = () => {
      URL.revokeObjectURL(url);
    };
  } catch (error) {
    console.error("Error playing TTS:", error);
  }
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
  disabled,
}: {
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  currentGuess: string;
  disabled: boolean;
}) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
  currentGuess,
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
            index === currentGuess.length ? "active" : ""
          } ${index < currentGuess.length ? "filled" : ""}`}
        >
          {index < currentGuess.length ? currentGuess[index] : ""}
        </div>
      ))}
    </div>
  );
};

// Component for flying letters
const FlyingLetter = ({
  letter,
  startPosition,
  onAnimationEnd,
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
        color: "#4a5568",
      }}
      onAnimationEnd={onAnimationEnd}
    >
      {letter}
    </div>
  );
};

// Utility function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

// Main flashcard game component
const SpellingFlashCardGame = () => {
  // NEW: State for the current word pair (word & pattern) and the remaining words
  const [currentPair, setCurrentPair] = useState<{ word: string; pattern: string } | null>(null);
  const [availableWords, setAvailableWords] = useState<{ word: string; pattern: string }[]>([]);
  const [initialWordCount, setInitialWordCount] = useState<number>(0);

  // Other game states
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
  // NEW: state for settings and game start
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [selectedDisplayTime, setSelectedDisplayTime] = useState<number | null>(5); // default 5 seconds
  const [selectedSessionDuration, setSelectedSessionDuration] = useState<number | null>(5); // default 3 minutes
  const [settingsError, setSettingsError] = useState<string>("");

  // NEW: Initialize timers based on settings; defaults to 0 until game starts.
  const [countdown, setCountdown] = useState<number>(0);
  const [globalTimer, setGlobalTimer] = useState<number>(0);

  // Add flying letters state
  const [flyingLetters, setFlyingLetters] = useState<
    Array<{
      letter: string;
      position: { x: number; y: number };
      id: string;
    }>
  >([]);

  const MAX_ATTEMPTS = 3;

  // Load leaderboard from localStorage on component mount
  useEffect(() => {
    const storedLeaderboard = localStorage.getItem("leaderboard");
    if (storedLeaderboard) {
      setLeaderboard(JSON.parse(storedLeaderboard));
    }
  }, []);

  // NEW: When gameStarted becomes true, initialize timers and start the first round.
  useEffect(() => {
    if (gameStarted) {
      setCountdown(selectedDisplayTime as number);
      setGlobalTimer((selectedSessionDuration as number) * 60);
      startNewRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);

  // Countdown effect for the flashcard display
  useEffect(() => {
    if (!gameStarted || flipped) return; // Only run when game started and card is showing front

    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        // Start TTS when there are 3 seconds left
        if (prev === 3 && currentPair) {
          speakWord(currentPair.word).catch(console.error);
        }
        if (prev <= 1) {
          clearInterval(intervalId);
          setFlipped(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [gameStarted, flipped, currentPair]);

  // Global session timer countdown
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timerInterval = setInterval(() => {
      setGlobalTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(timerInterval);
          setMessage("Time's up! Game Over!");
          setGameOver(true);
          checkAndPromptHighScore();
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [gameStarted, gameOver]);

  // Starts a new round by selecting the next word from the available list.
  const startNewRound = () => {
    // If no words remain, end the game successfully.
    if (availableWords.length === 0) {
      setMessage("Congratulations! You completed all the words!");
      setGameOver(true);
      checkAndPromptHighScore();
      return;
    }
    // Select the next word (first in the list) and remove it.
    const nextPair = availableWords[0];
    setCurrentPair(nextPair);
    setAvailableWords(availableWords.slice(1));
    // Reset round-specific states.
    setFlipped(false);
    setCountdown(selectedDisplayTime as number);
    setCurrentGuess("");
    setGuessHistory([]);
    setAttempt(0);
    setMessage("");
  };

  const handleGuessSubmit = () => {
    if (!currentPair) return;

    // Get positions of the guess boxes for flying letter animation
    const guessBoxes = document.querySelectorAll(".guess-box");
    const positions = Array.from(guessBoxes).map((box) => {
      const rect = box.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - 15,
        y: rect.top + rect.height / 2 - 15,
      };
    });

    const letters = currentGuess.split("");
    const flyingLettersArr = letters.map((letter, index) => ({
      letter,
      position: positions[index],
      id: `${letter}-${index}-${Date.now()}`,
    }));
    setFlyingLetters(flyingLettersArr);
    setTimeout(() => {
      setFlyingLetters([]);
    }, 1000);

    if (currentGuess.toLowerCase() === currentPair.word.toLowerCase()) {
      const baseScore = 25 * currentPair.word.length;
      const roundScore = Math.max(Math.floor(baseScore * (1 - 0.2 * attempt)), 0);
      setScore((prev) => prev + roundScore);
      setGuessHistory([...guessHistory, currentGuess]);

      new Audio(successSound).play();
      setAttempt((prev) => prev + 1);

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
        setMessage(`The correct word was "${currentPair.word}".`);
        setTimeout(() => {
          setAnimateSuccess(false);
          setShowCelebration(true);
          setTimeout(() => {
            startNewRound();
          }, 2000);
        }, 600);
      }
    }
    setCurrentGuess("");
  };

  // Handlers for the virtual keyboard
  const handleLetterClick = (letter: string) => {
    if (!currentPair) return;
    if (currentGuess.length < currentPair.word.length) {
      setCurrentGuess((prev) => prev + letter);
    }
  };

  const handleBackspace = () => {
    setCurrentGuess((prev) => prev.slice(0, -1));
  };

  // Check if the final score qualifies for the leaderboard.
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
    setFlipped(false);
    setCurrentGuess("");
    setGuessHistory([]);
    setAttempt(0);
    setMessage("");
    setShowCelebration(false);
    // Reset gameStarted so that the settings screen is shown again.
    setGameStarted(false);
  };

  // Renders a row for a guess with feedback for each letter.
  const renderGuessRow = (guess: string) => {
    const totalCells = Math.max(currentPair?.word.length || 0, guess.length);
    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalCells }).map((_, index) => {
          const expectedLetter =
            index < (currentPair?.word.length || 0) ? currentPair?.word[index] : null;
          const guessedLetter = guess[index] || "";
          let cellClass = "";
          if (expectedLetter !== null) {
            if (!guessedLetter) {
              cellClass = "bg-red-500 text-white";
            } else if (
              guessedLetter.toLowerCase() === expectedLetter.toLowerCase()
            ) {
              cellClass = "bg-green-500 text-white";
            } else {
              cellClass = "bg-gray-300 text-black";
            }
          } else {
            cellClass = "bg-gray-300 text-black";
          }
          return (
            <div
              key={index}
              className={`w-10 h-10 flex items-center justify-center border ${cellClass}`}
            >
              {guessedLetter.toUpperCase()}
            </div>
          );
        })}
      </div>
    );
  };

  // Renders an empty row for remaining attempts.
  const renderEmptyRow = () => {
    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length: currentPair?.word.length || 0 }).map((_, index) => (
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

  // Formats the global timer for display.
  const formattedTime = `${Math.floor(globalTimer / 60)}:${
    globalTimer % 60 < 10 ? "0" : ""
  }${globalTimer % 60}`;

  // NEW: Handler for starting the game via the settings screen.
  const handleStartGame = () => {
    if (selectedDisplayTime === null || selectedSessionDuration === null) {
      setSettingsError("Please select both display time and session duration.");
      return;
    }
    setSettingsError("");
    // Reset game states.
    setScore(0);
    setGameOver(false);
    setPlayerName("");
    setShowNamePrompt(false);
    setFlipped(false);
    setCurrentGuess("");
    setGuessHistory([]);
    setAttempt(0);
    setMessage("");
    setShowCelebration(false);
    // Initialize timers.
    setCountdown(selectedDisplayTime);
    setGlobalTimer(selectedSessionDuration * 60);
    // Shuffle the word pool and store in state.
    const shuffledWords = shuffleArray([...wordPairs]);
    setAvailableWords(shuffledWords);
    setInitialWordCount(shuffledWords.length);
    // Start the game.
    setGameStarted(true);
  };

  // NEW: Start Screen Component.
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-200 via-pink-100 to-blue-200 p-4 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Spelling Flashcard Game!</h1>
        <div className="bg-white rounded-xl shadow-rainbow p-6 mb-4">
          <h2 className="text-2xl font-bold mb-4">Game Settings</h2>
          <div className="mb-4" style={{display: "none"}}>
            <p className="mb-2">Word Display Time:</p>
            <label className="mr-4">
              <input type="radio" name="displayTime" onChange={() => setSelectedDisplayTime(5)} checked={selectedDisplayTime === 5} /> 5 seconds
            </label>
            <label className="mr-4">
              <input type="radio" name="displayTime" onChange={() => setSelectedDisplayTime(10)} /> 10 seconds
            </label>
            <label className="mr-4">
              <input type="radio" name="displayTime" onChange={() => setSelectedDisplayTime(15)} /> 15 seconds
            </label>
          </div>
          <div className="mb-4" style={{display: "none"}}>
            <p className="mb-2">Session Duration:</p>
            <label className="mr-4">
              <input type="radio" name="sessionDuration" onChange={() => setSelectedSessionDuration(3)} /> 3 minutes
            </label>
            <label className="mr-4">
              <input type="radio" name="sessionDuration" onChange={() => setSelectedSessionDuration(5)}  checked={selectedSessionDuration === 5}/> 5 minutes
            </label>
            <label className="mr-4">
              <input type="radio" name="sessionDuration" onChange={() => setSelectedSessionDuration(7)} /> 7 minutes
            </label>
          </div>
          {settingsError && <p className="text-red-500 mb-2">{settingsError}</p>}
          <div className="flex justify-center">
            <button onClick={handleStartGame} className="bg-green-500 text-white px-12 py-4 rounded">
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-pink-100 to-blue-200 p-4">
      {/* Flying letters */}
      {flyingLetters.map(({ letter, position, id }) => (
        <FlyingLetter
          key={id}
          letter={letter}
          startPosition={position}
          onAnimationEnd={() => {
            setFlyingLetters((prev) => prev.filter((l) => l.id !== id));
          }}
        />
      ))}

      <div className="flex justify-between items-start max-w-6xl mx-auto mb-8">
        {/* Left side: Leaderboard */}
        <div className="w-1/4 bg-white rounded-xl shadow-rainbow p-6 animate-float">
          <h2 className="text-2xl font-bold text-purple-600 mb-4">🏆 High Scores</h2>
          <ul className="space-y-2">
            {leaderboard.map((entry, index) => (
              <li
                key={index}
                className="border-b border-purple-100 py-2 flex justify-between items-center"
              >
                <span className="font-bold text-purple-700">{entry.name}</span>
                <span className="text-pink-500 font-bold">{entry.score}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Center: Main game content */}
        <div className="w-2/4 px-8">
          <div className={`flip-card-container ${animateSuccess ? "animate-success" : ""}`}>
            <div className={`flip-card ${flipped ? "flipped" : ""}`}>
              {/* Front of the card: Flashcard view */}
              <div className="flip-card-front bg-white p-8 rounded-lg shadow-lg text-center">
                <p className="mt-4 mb-4 text-xl">Memorize the word!</p>
                <h2 className="text-6xl font-bold uppercase">
                  {currentPair?.word}
                </h2>
                <p className="mt-2 text-2xl text-gray-500 font-light">
                  {currentPair?.pattern}
                </p>
                <p className="mt-2 text-2xl font-bold">{countdown}</p>
              </div>
              {/* Back of the card: Spelling view */}
              <div className="flip-card-back bg-white p-8 rounded-lg shadow-lg">
                <div className="text-center mb-4">
                  <span
                    className={`text-2xl font-bold ${
                      globalTimer <= 10 ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    Time Left: {formattedTime}
                  </span>
                </div>
                {/* Progress Indicator */}
                <div className="text-center mb-4">
                  <span className="text-lg font-semibold">
                    Progress: {initialWordCount - availableWords.length} / {initialWordCount}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {guessHistory.map((guess, index) => (
                    <div key={index}>{renderGuessRow(guess)}</div>
                  ))}
                  {Array.from({ length: MAX_ATTEMPTS - guessHistory.length }).map((_, idx) => (
                    <div key={idx}>{renderEmptyRow()}</div>
                  ))}
                </div>
                {message && <p className="mb-2 text-lg text-center">{message}</p>}
                {!gameOver && attempt < MAX_ATTEMPTS && (
                  <div className="flex flex-col items-center gap-4">
                    <CurrentGuessRow word={currentPair?.word || ""} currentGuess={currentGuess} />
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
