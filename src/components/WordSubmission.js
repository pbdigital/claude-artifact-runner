import React, { useState } from 'react';

/**
 * WordSubmission Component
 * 
 * This component allows a user to submit a word and displays it in a wordle-style row of boxes.
 * If the submitted word is shorter than the target word, the missing letters are shown with a red background.
 * Extra letters are allowed in the input but only the first correctWord.length characters are displayed.
 * 
 * Props:
 *   @param {string} correctWord - The target word the user is trying to match.
 */
function WordSubmission({ correctWord }) {
  const [submission, setSubmission] = useState('');

  // Handler for input changes
  const handleChange = (e) => {
    setSubmission(e.target.value);
  };

  // Renders the boxes for each letter position in the target word.
  // If a letter is not provided by the user, the box will have a red background to indicate a missing letter.
  const renderBoxes = () => {
    const boxes = [];
    // Always display boxes equal to the length of the target word.
    for (let i = 0; i < correctWord.length; i++) {
      // Use the letter from submission if available, otherwise empty string
      const letter = i < submission.length ? submission[i] : '';
      boxes.push(
        <div
          key={i}
          style={{
            width: '50px',
            height: '50px',
            border: '2px solid #000',
            margin: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            backgroundColor: letter === '' ? '#f88' : '#fff'
          }}
        >
          {letter}
        </div>
      );
    }
    return boxes;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="word-input">Enter your word: </label>
        <input
          id="word-input"
          type="text"
          value={submission}
          onChange={handleChange}
        />
      </div>
      <div style={{ display: 'flex' }}>
        {renderBoxes()}
      </div>
    </div>
  );
}

export default WordSubmission; 