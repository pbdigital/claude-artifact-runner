export const quizStyles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  question: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#333',
  },
  choiceButton: {
    width: '100%',
    padding: '15px',
    margin: '10px 0',
    fontSize: '18px',
    border: '2px solid #ddd',
    borderRadius: '10px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  correct: {
    backgroundColor: '#90EE90',
    borderColor: '#006400',
  },
  incorrect: {
    backgroundColor: '#FFB6C1',
    borderColor: '#8B0000',
  },
  score: {
    fontSize: '24px',
    textAlign: 'center' as const,
    marginTop: '20px',
  },
  playAgain: {
    padding: '15px 30px',
    fontSize: '20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    margin: '20px auto',
    display: 'block',
  },
  errorMessage: {
    color: '#d32f2f',
    textAlign: 'center' as const,
    padding: '20px',
  },
  loadingSpinner: {
    textAlign: 'center' as const,
    padding: '40px',
  }
}; 