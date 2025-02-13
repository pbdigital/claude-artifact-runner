import { useState, useEffect } from "react";
import OpenAI from 'openai';
import { quizTopics } from './quizTopics';

// Types for our quiz data
interface QuizQuestion {
  type: "multiple-choice" | "open-ended" | "explain";
  question: string;
  // For multiple-choice questions
  options?: string[];
  correctAnswer?: string;
  // Additional help fields (if needed)
  example?: string;
  tips?: string;
  hints?: string;
}

interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  isLoading: boolean;
  isGameOver: boolean;
  selectedAnswer: string | null;
}

/**
 * SimileQuiz - An interactive quiz component for learning similes
 * Presents multiple choice questions and tracks user progress
 */
const SimileQuiz: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    isLoading: true,
    isGameOver: false,
    selectedAnswer: null,
  });
  const [error, setError] = useState<string | null>(null);

  // NEW: State to control whether to show the hint.
  const [showHint, setShowHint] = useState(false);

  // Styles for our quiz interface
  const styles = {
    container: {
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
    },
    question: {
      fontSize: "24px",
      marginBottom: "20px",
      color: "#333",
    },
    choiceButton: {
      width: "100%",
      padding: "15px",
      margin: "10px 0",
      fontSize: "18px",
      border: "2px solid #ddd",
      borderRadius: "10px",
      backgroundColor: "white",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    correct: {
      backgroundColor: "#90EE90",
      borderColor: "#006400",
    },
    incorrect: {
      backgroundColor: "#FFB6C1",
      borderColor: "#8B0000",
    },
    score: {
      fontSize: "24px",
      textAlign: "center" as const,
      marginTop: "20px",
    },
    playAgain: {
      padding: "15px 30px",
      fontSize: "20px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      margin: "20px auto",
      display: "block",
    },
    hint: {
      fontSize: "18px",
      fontStyle: "italic",
      marginBottom: "15px",
      color: "#777",
    },
    // NEW: style for the hint button
    hintButton: {
      padding: "10px 20px",
      fontSize: "16px",
      backgroundColor: "#007BFF",
      color: "white",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      margin: "10px 0",
    },
  };

  // NEW: Reset the hint visibility when moving to a new question.
  useEffect(() => {
    setShowHint(false);
  }, [quizState.currentQuestionIndex]);

  // Function to generate quiz questions using OpenAI
  const generateQuestions = async () => {
    try {
      setError(null);
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
        dangerouslyAllowBrowser: true,
      });

      // Select a random topic
      const randomTopic = quizTopics[Math.floor(Math.random() * quizTopics.length)];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              Generate 5 engaging simile exercises to help 7 to 9-year-old girls practice using similes in a fun and interactive way.
      - The theme of this exercise should be about ${randomTopic}.
      - Questions should be **clear** and **age-appropriate**, ensuring there is only one best answer.
      - Avoid ambiguous answers where multiple choices could be correct.
      - Include a mix of:
        - Multiple-choice questions (fill in the blank with four choices, one correct).
        - Open-ended questions (The child must create her own simile).
        - "Explain the meaning" questions (The child must think about why a simile works or doesn't work).
      - Example multiple-choice format:
        - **Good:** "Her smile was as warm as ______."
          - ✅ A cozy fireplace (Correct)
          - ❌ A frozen lake (Clearly wrong)
          - ❌ A block of ice (Clearly wrong)
          - ❌ A shadow (Clearly wrong)
      - Keep the language **fun and playful** to keep Indiana engaged.
      - Format the output as a JSON array of objects, where each object contains:
        {
          "type": "multiple-choice,open-ended,explain",
        "question": "",
          "options": ["", "", "", ""],
          "example" : "",
          "tips" : "Provide a tip for the user to understand the simile better",
          "hints" : "Provide a hint for the user to help them answer the question more easily",
          "answer": ""
        }
      - **Return only a valid JSON array, with no extra text, formatting, or escape sequences.
            `,
          },
        ],
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content received from OpenAI");

      const parsedQuestions = JSON.parse(content);
      const formattedQuestions: QuizQuestion[] = parsedQuestions.map(
        (q: any) => ({
          type: q.type as "multiple-choice" | "open-ended" | "explain",
          question: q.question,
          options: q.options || [],
          correctAnswer: q.answer,
          hints: q.hints,
          tips: q.tips,
        })
      );

      setQuizState((prev) => ({
        ...prev,
        questions: formattedQuestions,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error generating questions:", error);
      setError("Failed to load quiz questions. Please try again.");
      setQuizState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (selectedChoice: string) => {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = selectedChoice === currentQuestion.correctAnswer;

    setQuizState((prev) => ({
      ...prev,
      selectedAnswer: selectedChoice,
      score: isCorrect ? prev.score + 1 : prev.score,
    }));

    // Move to next question after a delay
    setTimeout(() => {
      if (quizState.currentQuestionIndex === quizState.questions.length - 1) {
        setQuizState((prev) => ({ ...prev, isGameOver: true }));
      } else {
        setQuizState((prev) => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          selectedAnswer: null,
        }));
      }
    }, 1500);
  };

  // Modify the handleTextSubmit to simply move to next question
  const handleTextSubmit = () => {
    // Move to the next question immediately
    if (quizState.currentQuestionIndex === quizState.questions.length - 1) {
      setQuizState((prev) => ({ ...prev, isGameOver: true }));
    } else {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswer: null,
      }));
    }
  };

  // Reset the quiz
  const resetQuiz = () => {
    setQuizState({
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      isLoading: true,
      isGameOver: false,
      selectedAnswer: null,
    });
    generateQuestions();
  };

  // Initial question generation
  useEffect(() => {
    generateQuestions();
  }, []);

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.score, color: "#d32f2f" }}>
          {error}
          <button style={styles.playAgain} onClick={resetQuiz}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quizState.isLoading) {
    return <div style={styles.container}>Generating quiz questions...</div>;
  }

  if (quizState.isGameOver) {
    return (
      <div style={styles.container}>
        
        <button style={styles.playAgain} onClick={resetQuiz}>
          Play Again
        </button>
      </div>
    );
  }

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

  return (
    <div style={styles.container}>
      <div style={styles.question}>
        Question {quizState.currentQuestionIndex + 1}: {currentQuestion.question}
      </div>
      
      {/* Render the tip */}
      {currentQuestion.tips && (
        <div style={styles.hint}>
          Tip: {currentQuestion.tips}
        </div>
      )}
      
      {/* Render a button to reveal the hint if available */}
      {currentQuestion.hints && (
        <div>
          {!showHint ? (
            <button style={styles.hintButton} onClick={() => setShowHint(true)}>
              Show Hint
            </button>
          ) : (
            <div style={styles.hint}>
              Hint: {currentQuestion.hints}
            </div>
          )}
        </div>
      )}

      {currentQuestion.type === "multiple-choice" && (
        <div>
          {currentQuestion.options &&
            currentQuestion.options.map((choice: string, index: number) => {
              const isSelected = quizState.selectedAnswer === choice;
              const isCorrect = choice === currentQuestion.correctAnswer;
              let buttonStyle = { ...styles.choiceButton };

              if (quizState.selectedAnswer) {
                if (isCorrect) {
                  buttonStyle = { ...buttonStyle, ...styles.correct };
                } else if (isSelected) {
                  buttonStyle = { ...buttonStyle, ...styles.incorrect };
                }
              }

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={() =>
                    !quizState.selectedAnswer && handleAnswerSelect(choice)
                  }
                  disabled={!!quizState.selectedAnswer}
                >
                  {choice}
                </button>
              );
            })}
        </div>
      )}

      {currentQuestion.type === "open-ended" && (
        <div>
          <div style={{ ...styles.hint, marginBottom: "20px" }}>
            Discuss the simile together and come up with a creative answer!
          </div>
          <button
            style={{...styles.playAgain, marginTop: "10px"}}
            onClick={handleTextSubmit}
          >
            Next Question
          </button>
        </div>
      )}

      {currentQuestion.type === "explain" && (
        <div>
          <div style={{ ...styles.hint, marginBottom: "20px" }}>
            Talk about what this simile means and why it works!
          </div>
          <button
            style={{...styles.playAgain, marginTop: "10px"}}
            onClick={handleTextSubmit}
          >
            Next Question
          </button>
        </div>
      )}

    
    </div>
  );
};

export default SimileQuiz;
