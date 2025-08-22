// Quiz management and interaction handling
class QuizManager {
    constructor() {
        this.quizData = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null;
        this.timer = null;
        this.timeRemaining = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitQuiz());
        }
    }

    initializeQuiz(quizData, startTime) {
        this.quizData = quizData;
        this.startTime = startTime;
        this.currentQuestionIndex = 0;
        this.answers = new Array(quizData.questions.length).fill(null);
        this.timeRemaining = quizData.timeLimit;

        // Update quiz title
        const quizTitle = document.getElementById('quizTitle');
        if (quizTitle) {
            quizTitle.textContent = quizData.title;
        }

        // Start timer
        this.startTimer();

        // Display first question
        this.displayQuestion();

        // Update navigation
        this.updateNavigation();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.stopTimer();
                this.submitQuiz();
            }
            
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    displayQuestion() {
        if (!this.quizData || !this.quizData.questions) {
            console.error('No quiz data available');
            return;
        }

        const question = this.quizData.questions[this.currentQuestionIndex];
        const questionContainer = document.getElementById('questionContainer');
        const questionCounter = document.getElementById('questionCounter');

        if (!questionContainer || !questionCounter) return;

        // Update question counter
        questionCounter.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.quizData.questions.length}`;

        // Create question HTML
        const questionHTML = `
            <div class="question">
                <h3>${question.question}</h3>
                <div class="options">
                    ${question.options.map((option, index) => `
                        <div class="option ${this.answers[this.currentQuestionIndex] === index ? 'selected' : ''}" 
                             data-index="${index}">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        questionContainer.innerHTML = questionHTML;

        // Add click event listeners to options
        const options = questionContainer.querySelectorAll('.option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                this.selectOption(parseInt(option.dataset.index));
            });
        });
    }

    selectOption(optionIndex) {
        this.answers[this.currentQuestionIndex] = optionIndex;
        
        // Update visual selection
        const options = document.querySelectorAll('.option');
        options.forEach((option, index) => {
            option.classList.remove('selected');
            if (index === optionIndex) {
                option.classList.add('selected');
            }
        });

        // Update navigation
        this.updateNavigation();
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
            this.updateNavigation();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.quizData.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentQuestionIndex === this.quizData.questions.length - 1;
        }

        // Show submit button on last question if all questions are answered
        if (submitBtn) {
            const allAnswered = this.answers.every(answer => answer !== null);
            submitBtn.style.display = (this.currentQuestionIndex === this.quizData.questions.length - 1 && allAnswered) ? 'block' : 'none';
        }
    }

    submitQuiz() {
        this.stopTimer();

        // Check if all questions are answered
        const unansweredQuestions = this.answers.filter(answer => answer === null).length;
        if (unansweredQuestions > 0) {
            if (confirm(`You have ${unansweredQuestions} unanswered question(s). Are you sure you want to submit?`)) {
                this.completeQuiz();
            } else {
                // Resume timer if user cancels
                this.startTimer();
                return;
            }
        } else {
            this.completeQuiz();
        }
    }

    completeQuiz() {
        // Calculate results
        const results = this.calculateResults();
        
        // Submit results to server
        if (window.quizClient) {
            window.quizClient.submitQuizResults({
                answers: this.answers,
                timeTaken: this.quizData.timeLimit - this.timeRemaining,
                completedAt: new Date()
            });
        }

        // Show results screen
        this.showResults(results);
    }

    calculateResults() {
        let score = 0;
        const maxScore = this.quizData.questions.reduce((total, q) => total + q.points, 0);
        
        this.answers.forEach((answer, index) => {
            const question = this.quizData.questions[index];
            if (answer === question.correctAnswer) {
                score += question.points;
            }
        });

        const percentage = Math.round((score / maxScore) * 100);
        const timeTaken = this.quizData.timeLimit - this.timeRemaining;

        return {
            score,
            maxScore,
            percentage,
            timeTaken,
            answers: this.answers
        };
    }

    showResults(results) {
        // Hide quiz screen and show results screen
        document.getElementById('quizScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';

        // Update result values
        const finalScore = document.getElementById('finalScore');
        const finalPercentage = document.getElementById('finalPercentage');
        const timeTaken = document.getElementById('timeTaken');
        const resultsMessage = document.getElementById('resultsMessage');

        if (finalScore) {
            finalScore.textContent = `${results.score}/${results.maxScore}`;
        }

        if (finalPercentage) {
            finalPercentage.textContent = `${results.percentage}%`;
        }

        if (timeTaken) {
            timeTaken.textContent = `${results.timeTaken}s`;
        }

        if (resultsMessage) {
            let message = '';
            if (results.percentage >= 80) {
                message = 'Excellent! You have a great understanding of the subject.';
            } else if (results.percentage >= 60) {
                message = 'Good job! You have a solid understanding of the subject.';
            } else if (results.percentage >= 40) {
                message = 'Not bad! Consider reviewing the material to improve your score.';
            } else {
                message = 'Keep studying! Review the material to improve your understanding.';
            }
            resultsMessage.textContent = message;
        }
    }

    resetQuiz() {
        this.stopTimer();
        this.quizData = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null;
        this.timeRemaining = 0;

        // Clear question container
        const questionContainer = document.getElementById('questionContainer');
        if (questionContainer) {
            questionContainer.innerHTML = '';
        }

        // Reset timer display
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = '--:--';
        }

        // Reset question counter
        const questionCounter = document.getElementById('questionCounter');
        if (questionCounter) {
            questionCounter.textContent = 'Question 1 of 0';
        }

        // Hide submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
    }
}

// Initialize the quiz manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.quizManager = new QuizManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizManager;
}
