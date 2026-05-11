import { useState, useEffect } from 'react';
import { Modal, Button, Card, Form, Spinner, Alert } from 'react-bootstrap';

const MovieQuizModal = ({ show, onHide, movieId, movieTitle }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show && !quizStarted) {
      loadQuestions();
    }
  }, [show, quizStarted]);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/movies/${movieId}/quiz-questions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Не вдалося завантажити питання');
      
      const data = await response.json();
      setQuestions(data);
      setAnswers(new Array(data.length).fill(null));
    } catch (err) {
      setError('Помилка при завантаженні опитування. Спробуйте пізніше.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (questions.length === 0) {
      setError('Питання не завантажилися. Спробуйте ще раз.');
      return;
    }
    setQuizStarted(true);
    setCurrentQuestion(0);
  };

  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movies/${movieId}/submit-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          answers: answers.map((answer, index) => ({
            questionIndex: index,
            selectedOptionIndex: answer
          }))
        })
      });

      if (!response.ok) throw new Error('Помилка при обробці результатів');

      const result = await response.json();
      setRating(result.rating);
      
      if (result.stats) {
        localStorage.setItem('userQuizStats', JSON.stringify(result.stats));
      }
      
      setQuizCompleted(true);
    } catch (err) {
      setError('Помилка при обробці ваших відповідей');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentQuestion(0);
    setAnswers([]);
    setRating(null);
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
        <Modal.Title>🎬 Тест знання: {movieTitle}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: 'var(--primary-color)' }} />
            <p className="mt-3">Завантаження опитування...</p>
          </div>
        ) : !quizStarted ? (
          <div className="text-center">
            <p className="lead mb-4">
              Чи добре ви знаєте цей фільм? Пройдіть невеликий тест і дізнайтесь ваш персональний рейтинг знання фільму!
            </p>
            <p className="text-muted mb-4">
              {questions.length} питань • На кожне питання ~1 хвилина
            </p>
            <Button variant="primary" size="lg" onClick={handleStartQuiz}>
              🚀 Розпочати тест
            </Button>
          </div>
        ) : quizCompleted ? (
          <div className="text-center py-4">
            <h3 className="mb-4">📊 Ваш результат</h3>
            
            <div className="mb-4 p-4 rounded" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--primary-color)' }}>
              <p className="text-muted mb-2">Персональний рейтинг знання фільму</p>
              <h1 style={{ fontSize: '3rem', color: 'var(--primary-color)', margin: '0' }}>
                {rating}/100
              </h1>
            </div>

            <div className="mb-4">
              {rating >= 80 && <p className="fs-5">🏆 Вайлік! Ви справжній фанат цього фільму!</p>}
              {rating >= 60 && rating < 80 && <p className="fs-5">😊 Непогано! Ви добре знаєте цей фільм.</p>}
              {rating >= 40 && rating < 60 && <p className="fs-5">🤔 Середній результат. Варто переглянути фільм ще раз!</p>}
              {rating < 40 && <p className="fs-5">📽️ Поки що незнайомий фільм. Рекомендуємо переглянути його!</p>}
            </div>

            <Button variant="success" onClick={handleClose} className="me-2">
              ✅ Закрити
            </Button>
            <Button variant="outline-primary" onClick={() => { setQuizStarted(false); setQuizCompleted(false); setCurrentQuestion(0); setAnswers(new Array(questions.length).fill(null)); }}>
              🔄 Спробувати ще раз
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Питання {currentQuestion + 1} з {questions.length}</span>
                <div className="progress" style={{ width: '200px', height: '8px' }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                      backgroundColor: 'var(--primary-color)'
                    }}
                  />
                </div>
              </div>
            </div>

            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="mb-4">
              <Card.Body>
                <h5 className="mb-4" style={{ color: 'var(--text-main)' }}>
                  {questions[currentQuestion]?.question}
                </h5>

                <Form>
                  {questions[currentQuestion]?.options.map((option, index) => (
                    <Form.Check
                      key={index}
                      type="radio"
                      label={option}
                      name={`option-${currentQuestion}`}
                      id={`option-${index}`}
                      checked={answers[currentQuestion] === index}
                      onChange={() => handleAnswerSelect(index)}
                      className="mb-3"
                      style={{ color: 'var(--text-main)' }}
                    />
                  ))}
                </Form>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between">
              <Button
                variant="secondary"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                ← Попереднє
              </Button>

              {currentQuestion === questions.length - 1 ? (
                <Button
                  variant="success"
                  onClick={handleSubmitQuiz}
                  disabled={answers[currentQuestion] === null || loading}
                >
                  {loading ? 'Обробка...' : '✅ Завершити тест'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={answers[currentQuestion] === null}
                >
                  Далі →
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default MovieQuizModal;