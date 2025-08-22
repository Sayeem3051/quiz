// Quiz management and interaction handling
class QuizManager {
    constructor() {
        this.quizData = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null; // timestamp when quiz started
        
        // Per-question timer (5 seconds)
        this.questionTimeLimitSeconds = 5;
        this.questionTimer = null;
        this.questionTimeRemaining = 0;
        this.optionsLocked = false;
        
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
        // Record quiz start time for time taken calculation
        this.startTime = startTime ? new Date(startTime) : new Date();
        this.currentQuestionIndex = 0;
        this.answers = new Array(quizData.questions.length).fill(null);

        // Update quiz title
        const quizTitle = document.getElementById('quizTitle');
        if (quizTitle) {
            quizTitle.textContent = quizData.title;
        }

        // Display first question
        this.displayQuestion();

        // Update navigation
        this.updateNavigation();
    }

    // Per-question timer handlers
    startQuestionTimer() {
        this.stopQuestionTimer();
        this.questionTimeRemaining = this.questionTimeLimitSeconds;
        this.updateQuestionTimerDisplay();
        this.questionTimer = setInterval(() => {
            this.questionTimeRemaining--;
            this.updateQuestionTimerDisplay();
            if (this.questionTimeRemaining <= 0) {
                this.stopQuestionTimer();
                this.lockOptions();
                // Advance to next question or submit if this is the last question
                // Do not auto-advance; wait for admin's Next
                // Auto-submit only if last question AND admin does not advance further
                if (this.currentQuestionIndex === this.quizData.questions.length - 1) {
                    // Keep on last question; submission will occur when admin ends or user submits
                }
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
    }

    updateQuestionTimerDisplay() {
        const questionTimerDisplay = document.getElementById('questionTimerDisplay');
        if (questionTimerDisplay) {
            const seconds = Math.max(0, this.questionTimeRemaining);
            questionTimerDisplay.textContent = `00:${seconds.toString().padStart(2, '0')}`;
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
                if (!this.optionsLocked) {
                    this.selectOption(parseInt(option.dataset.index));
                }
            });
        });

        // Start/restart per-question timer
        this.startQuestionTimer();
        this.unlockOptions();
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

    syncQuestionIndex(serverIndex) {
        if (!this.quizData) return;
        const clamped = Math.max(0, Math.min(serverIndex, this.quizData.questions.length - 1));
        if (clamped !== this.currentQuestionIndex) {
            this.currentQuestionIndex = clamped;
            this.displayQuestion();
            this.updateNavigation();
        } else if (this.optionsLocked && this.questionTimeRemaining > 0) {
            // keep timer consistent
            this.updateQuestionTimerDisplay();
        }
    }

    lockOptions() {
        this.optionsLocked = true;
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
            opt.style.opacity = '0.6';
        });
    }

    unlockOptions() {
        this.optionsLocked = false;
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            opt.classList.remove('disabled');
            opt.style.pointerEvents = '';
            opt.style.opacity = '';
        });
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        // Admin controls navigation; keep client Prev/Next disabled
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;

        // Show submit button on last question if all questions are answered
        if (submitBtn) {
            const allAnswered = this.answers.every(answer => answer !== null);
            submitBtn.style.display = (this.currentQuestionIndex === this.quizData.questions.length - 1 && allAnswered) ? 'block' : 'none';
        }
    }

    submitQuiz() {
        this.stopQuestionTimer();

        // Check if all questions are answered
        const unansweredQuestions = this.answers.filter(answer => answer === null).length;
        if (unansweredQuestions > 0) {
            if (confirm(`You have ${unansweredQuestions} unanswered question(s). Are you sure you want to submit?`)) {
                this.completeQuiz();
            } else {
                // Resume per-question timer if user cancels
                this.startQuestionTimer();
                return;
            }
        } else {
            this.completeQuiz();
        }
    }

    // Submit without confirmation (used by per-question auto-advance on last question)
    forceSubmitQuiz() {
        this.stopQuestionTimer();
        this.completeQuiz();
    }

    completeQuiz() {
        // Calculate results
        const results = this.calculateResults();
        
        // Submit results to server via client controller
        if (window.quizClient && typeof window.quizClient.submitQuiz === 'function') {
            try {
                window.quizClient.submitQuiz(results.answers);
            } catch (e) {
                console.error('Submit failed:', e);
            }
        }

        // Show results on the client UI
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
        const now = new Date();
        const timeTaken = Math.max(0, Math.round((now - this.startTime) / 1000));

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
        this.stopQuestionTimer();
        this.quizData = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null;

        // Clear question container
        const questionContainer = document.getElementById('questionContainer');
        if (questionContainer) {
            questionContainer.innerHTML = '';
        }

        // Reset per-question timer display
        const questionTimerDisplay = document.getElementById('questionTimerDisplay');
        if (questionTimerDisplay) {
            questionTimerDisplay.textContent = '00:00';
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
