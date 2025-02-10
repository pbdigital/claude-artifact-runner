import { useState, useEffect, useRef } from 'react';
import homophonePairs from './homophones.json';
import '../styles/globals.css';


interface Pair {
  word1: string;
  word2: string;
  tip1: string;
  tip2: string;
}

interface Item {
  id: string;
  word: string;
  pair: string;
  matched: boolean;
  isSelected?: boolean;
}

const TOTAL_PAIRS = 6;

export default function HomophonesMatchGame() {
  const [leftItems, setLeftItems] = useState<Item[]>([]);
  const [rightItems, setRightItems] = useState<Item[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<Item | null>(null);
  const [selectedRight, setSelectedRight] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [connections, setConnections] = useState<{ left: Item; right: Item }[]>([]);

  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize items on mount or reset
  const initGame = () => {
    const selectedPairs: Pair[] = [...homophonePairs]
      .sort(() => Math.random() - 0.5)
      .slice(0, TOTAL_PAIRS);

    // Mark the left items as "left-0", "left-1", etc.
    const left: Item[] = selectedPairs.map((pair, index) => ({
      id: `left-${index}`,
      word: pair.word1,
      pair: pair.word2,
      matched: false,
      isSelected: false,
    }));

    // Mark the right items as "right-0", "right-1", etc., but then shuffle them
    const right: Item[] = selectedPairs
      .map((pair, index) => ({
        id: `right-${index}`,
        word: pair.word2,
        pair: pair.word1,
        matched: false,
        isSelected: false,
      }))
      .sort(() => Math.random() - 0.5);

    setLeftItems(left);
    setRightItems(right);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMessage('');
    setConnections([]);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Check match when both selections exist
  useEffect(() => {
    if (selectedLeft && selectedRight) {
      if (selectedLeft.pair === selectedRight.word) {
        setMessage('Match found!');
        setConnections((prev) => [...prev, { left: selectedLeft, right: selectedRight }]);

        setLeftItems((items) =>
          items.map((item) =>
            item.id === selectedLeft.id ? { ...item, matched: true } : item
          )
        );
        setRightItems((items) =>
          items.map((item) =>
            item.id === selectedRight.id ? { ...item, matched: true } : item
          )
        );
        
        // Clear selections after a short delay for matches
        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
          setMessage('');
        }, 1000);
      } else {
        setMessage('Not a match.');
        // Immediately clear visual selections for non-matches
        setLeftItems((items) =>
          items.map((item) => ({ ...item, isSelected: false }))
        );
        setRightItems((items) =>
          items.map((item) => ({ ...item, isSelected: false }))
        );
        
        // Clear selections and message after a delay
        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
          setMessage('');
        }, 1000);
      }
    }
  }, [selectedLeft, selectedRight]);

  const handleLeftClick = (item: Item) => {
    if (item.matched) return; // Prevent clicking matched items
    
    setLeftItems((prevItems) =>
      prevItems.map((prevItem) => ({
        ...prevItem,
        isSelected: prevItem.id === item.id,
      }))
    );
    setSelectedLeft(item);
  };

  const handleRightClick = (item: Item) => {
    if (item.matched) return; // Prevent clicking matched items
    
    setRightItems((prevItems) =>
      prevItems.map((prevItem) => ({
        ...prevItem,
        isSelected: prevItem.id === item.id,
      }))
    );
    setSelectedRight(item);
  };

  /**
   * Correct approach: find the actual array index by ID,
   * then use that index to access our .current refs.
   * That ensures we match the correct DOM elements, even if "right-2" is visually at array index 4.
   */
  const getLineCoordinates = (left: Item, right: Item) => {
    if (!containerRef.current) return null;

    const leftIndex = leftItems.findIndex((li) => li.id === left.id);
    const rightIndex = rightItems.findIndex((ri) => ri.id === right.id);

    // If we can't find them in the array, bail out
    if (leftIndex < 0 || rightIndex < 0) return null;

    const leftEl = leftRefs.current[leftIndex];
    const rightEl = rightRefs.current[rightIndex];

    if (leftEl && rightEl) {
      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Connect center->center
      const x1 = (leftRect.left + leftRect.right) / 2 - containerRect.left;
      const y1 = (leftRect.top + leftRect.bottom) / 2 - containerRect.top;

      const x2 = (rightRect.left + rightRect.right) / 2 - containerRect.left;
      const y2 = (rightRect.top + rightRect.bottom) / 2 - containerRect.top;

      return { x1, y1, x2, y2 };
    }
    return null;
  };

  return (
    <div className="p-12 bg-purple-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-purple-800">
        Homophones Matching Game
      </h1>

      {/* Our container with 'relative' positioning */}
      <div
        ref={containerRef}
        className="relative flex justify-between max-w-4xl mx-auto px-8"
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            zIndex: 10,
          }}
          preserveAspectRatio="none"
        >
          {connections.map((connection, idx) => {
            const coords = getLineCoordinates(connection.left, connection.right);
            return (
              coords && (
                <line
                  key={idx}
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke="#bbb"
                  strokeWidth="4"
                  style={{
                    animation: 'drawLine 0.5s ease forwards',
                  }}
                />
              )
            );
          })}
        </svg>

        {/* Left Column */}
        <div className="flex flex-col gap-6 w-[40%]">
          <h2 className="text-2xl font-semibold text-purple-700 ">Select a word:</h2>
          {leftItems.map((item, idx) => (
            <div
              key={item.id}
              ref={(el) => (leftRefs.current[idx] = el)}
              onClick={() => handleLeftClick(item)}
              className={`p-6 border-4 rounded-xl cursor-pointer transition-all duration-300
                shadow-md text-center text-xl font-medium bg-white relative 
                ${
                  item.matched
                    ? 'item-matched'
                    : item.isSelected
                    ? 'item-selected'
                    : 'item-unselected'
                }
              `}
            >
              {item.word}
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 w-[40%]">
          <h2 className="text-2xl font-semibold text-purple-700">Find its match:</h2>
          {rightItems.map((item, idx) => (
            <div
              key={item.id}
              ref={(el) => (rightRefs.current[idx] = el)}
              onClick={() => handleRightClick(item)}
              className={`p-6 border-4 rounded-xl cursor-pointer transition-all duration-300
                shadow-md text-center text-xl font-medium bg-white relative 
                ${
                  item.matched
                    ? 'bg-green-100 border-green-500 opacity-75'
                    : item.isSelected
                    ? 'bg-red-100 border-red-500 transform scale-110 shadow-lg text-red-700 font-bold shadow-red-200'
                    : 'border-purple-200 hover:border-purple-300'
                }
              `}
            >
              {item.word}
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`mt-8 text-2xl font-bold text-center transition-opacity duration-300
            ${message.includes('Match') ? 'text-green-600' : 'text-red-500'}
          `}
        >
          {message}
        </div>
      )}

      <div className="text-center mt-12">
        <button
          onClick={initGame}
          className="bg-purple-600 text-white px-10 py-4 rounded-xl text-xl font-semibold
            hover:bg-purple-700 transform transition-all duration-300 hover:scale-105
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
            shadow-lg"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
