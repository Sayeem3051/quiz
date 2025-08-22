// Client connection and communication management
class QuizClient {
    constructor() {
        this.clientId = null;
        this.clientName = null;
        this.quizData = null;
        this.isConnected = false;
        
        this.initializeConnection();
        this.setupEventListeners();
    }

    async initializeConnection() {
        try {
            // Connect to the server
            const response = await fetch('/api/client/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.clientId = data.clientId;
                this.quizData = data.quizData;
                this.isConnected = true;
                
                this.updateConnectionStatus('connected', 'Connected');
                this.updateWaitingStatus('Connected to server');
                this.updateClientName();
                
                console.log('Connected to server with ID:', this.clientId);
                
                // If quiz already in progress, start immediately
                if (data.quizInProgress) {
                    await this.refreshQuizData();
                    this.startQuiz();
                } else {
                    // Otherwise, start checking quiz status
                    this.startStatusCheck();
                }
            } else {
                throw new Error('Failed to connect');
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.updateConnectionStatus('disconnected', 'Connection Error');
            this.updateWaitingStatus('Connection failed');
        }
    }

    startStatusCheck() {
        // Check quiz status every 2 seconds
        setInterval(async () => {
            if (this.isConnected) {
                try {
                    const response = await fetch('/api/status');
                    if (response.ok) {
                        const status = await response.json();
                        if (status.quizInProgress && !window.quizStarted) {
                            await this.refreshQuizData();
                            this.startQuiz();
                        }
                    }
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }
        }, 2000);
    }

    async refreshQuizData() {
        try {
            const response = await fetch('/api/quiz');
            if (response.ok) {
                this.quizData = await response.json();
            }
        } catch (err) {
            console.error('Failed to refresh quiz data', err);
        }
    }

    setupEventListeners() {
        // Update client name when page loads
        this.updateClientName();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden');
            } else {
                console.log('Page visible');
            }
        });
    }

    updateConnectionStatus(status, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }
    }

    updateWaitingStatus(status) {
        const waitingStatus = document.getElementById('waitingStatus');
        if (waitingStatus) {
            waitingStatus.textContent = status;
        }
    }

    updateClientName() {
        // Generate a unique client name
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        this.clientName = `Client-${timestamp}-${random}`;
        
        const clientNameElement = document.getElementById('clientName');
        if (clientNameElement) {
            clientNameElement.textContent = this.clientName;
        }
    }

    startQuiz() {
        console.log('Starting quiz...');
        window.quizStarted = true;
        
        // Hide welcome screen and show quiz screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        const quizScreen = document.getElementById('quizScreen');
        
        if (welcomeScreen && quizScreen) {
            welcomeScreen.style.display = 'none';
            quizScreen.style.display = 'block';
        }
        
        // Initialize quiz with the data we received
        if (window.quizManager && this.quizData) {
            window.quizManager.initializeQuiz(this.quizData, new Date());
        }
    }

    resetQuiz() {
        console.log('Resetting quiz...');
        window.quizStarted = false;
        
        // Show welcome screen and hide quiz screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        const quizScreen = document.getElementById('quizScreen');
        const resultsScreen = document.getElementById('resultsScreen');
        
        if (welcomeScreen && quizScreen && resultsScreen) {
            welcomeScreen.style.display = 'block';
            quizScreen.style.display = 'none';
            resultsScreen.style.display = 'none';
        }
        
        // Reset quiz state
        if (window.quizManager) {
            window.quizManager.resetQuiz();
        }
    }

    async submitQuiz(answers) {
        try {
            // Get answers from quiz manager if not provided
            if (!answers && window.quizManager) {
                const results = window.quizManager.calculateResults();
                answers = results.answers;
            }
            
            const response = await fetch('/api/client/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    answers: answers
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Quiz submitted successfully:', result);
                
                // Show results using quiz manager
                if (window.quizManager) {
                    window.quizManager.showResults(result);
                }
                
                return result;
            } else {
                throw new Error('Failed to submit quiz');
            }
        } catch (error) {
            console.error('Submit error:', error);
            throw error;
        }
    }
}

// Initialize the client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.quizClient = new QuizClient();
});
