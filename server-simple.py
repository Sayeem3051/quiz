from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
import uuid
from datetime import datetime
import io
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'quiz-admin-secret-key'
CORS(app)

# Sample quiz data
quiz_data = {
    "title": "General Knowledge Quiz",
    "description": "Test your knowledge with these general questions",
    "timeLimit": 300,
    "questions": [
        {
            "id": 1,
            "question": "What is the capital of France?",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "correctAnswer": 2,
            "points": 10
        },
        {
            "id": 2,
            "question": "Which planet is known as the Red Planet?",
            "options": ["Venus", "Mars", "Jupiter", "Saturn"],
            "correctAnswer": 1,
            "points": 10
        }
    ]
}

# Store data
connected_clients = {}
quiz_results = []
quiz_in_progress = False

# Serve static files
@app.route('/')
def admin_panel():
    """Serve the admin panel"""
    return send_from_directory('admin-panel', 'index.html')

@app.route('/client')
def client_system():
    """Serve the client system"""
    return send_from_directory('client-system', 'index.html')

@app.route('/admin-panel/<path:filename>')
def admin_static(filename):
    """Serve admin panel static files"""
    return send_from_directory('admin-panel', filename)

@app.route('/client-system/<path:filename>')
def client_static(filename):
    """Serve client system static files"""
    return send_from_directory('client-system', filename)

# Additional routes for client files
@app.route('/styles.css')
def client_styles():
    """Serve client styles.css"""
    return send_from_directory('client-system', 'styles.css')

@app.route('/client.js')
def client_js():
    """Serve client.js"""
    return send_from_directory('client-system', 'client.js')

@app.route('/quiz.js')
def quiz_js():
    """Serve quiz.js"""
    return send_from_directory('client-system', 'quiz.js')

@app.route('/api/status')
def get_status():
    return jsonify({
        'status': 'running',
        'quizInProgress': quiz_in_progress,
        'totalClients': len(connected_clients),
        'completedClients': len(quiz_results)
    })

@app.route('/api/quiz/start', methods=['POST'])
def start_quiz():
    global quiz_in_progress
    if quiz_in_progress:
        return jsonify({'error': 'Quiz already in progress'}), 400
    
    quiz_in_progress = True
    for client in connected_clients.values():
        client['status'] = 'ready'
    
    return jsonify({'message': 'Quiz started successfully'})

@app.route('/api/quiz/reset', methods=['POST'])
def reset_quiz():
    global quiz_in_progress, quiz_results
    quiz_in_progress = False
    quiz_results.clear()
    for client in connected_clients.values():
        client['status'] = 'waiting'
    
    return jsonify({'message': 'Quiz reset successfully'})

@app.route('/api/results')
def get_results():
    sorted_results = sorted(quiz_results, key=lambda x: (-x['score'], x['timeTaken']))
    return jsonify({'results': sorted_results})

@app.route('/api/results/download')
def download_results():
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Quiz Results"
        
        headers = ['Rank', 'Client Name', 'Score', 'Max Score', 'Percentage']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
        
        sorted_results = sorted(quiz_results, key=lambda x: (-x['score'], x['timeTaken']))
        for row, result in enumerate(sorted_results, 2):
            ws.cell(row=row, column=1, value=row-1)
            ws.cell(row=row, column=2, value=result['clientName'])
            ws.cell(row=row, column=3, value=result['score'])
            ws.cell(row=row, column=4, value=result['maxScore'])
            ws.cell(row=row, column=5, value=f"{result['percentage']}%")
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='quiz-results.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clients')
def get_clients():
    return jsonify({
        'totalClients': len(connected_clients),
        'clients': list(connected_clients.values())
    })

@app.route('/api/client/connect', methods=['POST'])
def client_connect():
    client_id = str(uuid.uuid4())
    client_info = {
        'id': client_id,
        'name': f'Client {len(connected_clients) + 1}',
        'status': 'waiting'
    }
    connected_clients[client_id] = client_info
    return jsonify({
        'clientId': client_id,
        'quizData': quiz_data,
        'totalClients': len(connected_clients)
    })

@app.route('/api/client/submit', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    client_id = data.get('clientId')
    
    if client_id not in connected_clients:
        return jsonify({'error': 'Client not found'}), 404
    
    client = connected_clients[client_id]
    client['status'] = 'completed'
    
    score = 0
    for i, answer in enumerate(data['answers']):
        if i < len(quiz_data['questions']):
            question = quiz_data['questions'][i]
            if answer == question['correctAnswer']:
                score += question['points']
    
    max_score = sum(q['points'] for q in quiz_data['questions'])
    percentage = round((score / max_score) * 100) if max_score > 0 else 0
    
    quiz_result = {
        'clientId': client_id,
        'clientName': client['name'],
        'score': score,
        'maxScore': max_score,
        'percentage': percentage,
        'timeTaken': 0
    }
    
    quiz_results.append(quiz_result)
    
    return jsonify({
        'message': 'Quiz submitted successfully',
        'score': score,
        'maxScore': max_score,
        'percentage': percentage
    })

if __name__ == '__main__':
    print("Starting Quiz Admin Panel Server (Simple Version)...")
    print("Server will run on: http://localhost:5000")
    print("Admin panel: http://localhost:5000/")
    print("Client system: http://localhost:5000/client")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
