// Dashboard script for MózgOnFire

document.addEventListener('DOMContentLoaded', () => {
    // Initial checks or setup common to all dashboards can go here
    // For example, ensuring the user is logged in, though specific pages do this too.
    // updateNavBasedOnLogin(); // auth.js should handle this if called on each page
});

// --- COMMON DATA RETRIEVAL ---
function getAllQuizzes() {
    return JSON.parse(localStorage.getItem('mozgOnFireQuizzes')) || [];
}

function getAllQuizSubmissions() {
    return JSON.parse(localStorage.getItem('mozgOnFireSubmissions')) || [];
}

function saveAllQuizSubmissions(submissions) {
    localStorage.setItem('mozgOnFireSubmissions', JSON.stringify(submissions));
}

function getConversionRequests() {
    return JSON.parse(localStorage.getItem('mozgOnFireConversionRequests')) || [];
}

function saveConversionRequests(requests) {
    localStorage.setItem('mozgOnFireConversionRequests', JSON.stringify(requests));
}


// --- STUDENT DASHBOARD FUNCTIONS ---
function loadStudentQuizzes() {
    const quizzes = getAllQuizzes();
    const currentUser = getCurrentUser();
    const container = document.getElementById('availableQuizzesContainer');
    container.innerHTML = ''; // Clear loading message

    const availableQuizzes = quizzes.filter(quiz => {
        return quiz.visibility === 'public' || 
               (quiz.visibility === 'unlisted' && isUnlistedQuizAccessible(quiz.id)); // Add logic for unlisted access if needed
        // Add private quiz logic here if/when implemented (e.g., check if student is assigned)
    });

    if (availableQuizzes.length === 0) {
        container.innerHTML = '<p>No quizzes available at the moment. Check back later!</p>';
        return;
    }

    availableQuizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');
        quizItem.innerHTML = `
            <span class="quiz-item-title">${quiz.title} (Difficulty: ${quiz.difficulty})</span>
            <div class="quiz-item-actions">
                <button onclick="startQuiz('${quiz.id}')">Start Quiz</button>
            </div>
        `;
        container.appendChild(quizItem);
    });
}

function isUnlistedQuizAccessible(quizId) {
    // This is a simplified check. A real unlisted link would have a unique token.
    // For now, if a student somehow navigates to an unlisted quiz (e.g. via a shared link that sets localStorage), allow.
    // A more robust system would involve checking a token from the URL against the quiz data.
    const params = new URLSearchParams(window.location.search);
    const quizParamId = params.get('id');
    const token = params.get('token');
    if (quizParamId === quizId && token) {
        const quiz = getAllQuizzes().find(q => q.id === quizId);
        return quiz && quiz.unlistedLink && quiz.unlistedLink.includes(token);
    }
    return false; // Default to not accessible unless explicitly via link
}


// --- TEACHER DASHBOARD FUNCTIONS ---
function loadTeacherQuizzes() {
    const allQuizzes = getAllQuizzes();
    const currentUser = getCurrentUser();
    const container = document.getElementById('teacherQuizzesContainer');
    container.innerHTML = ''; // Clear loading message

    const teacherQuizzes = allQuizzes.filter(quiz => quiz.createdBy === currentUser.userId);

    if (teacherQuizzes.length === 0) {
        container.innerHTML = '<p>You haven\'t created any quizzes yet. <a href="quiz_generator.html">Create one now!</a></p>';
        return;
    }

    teacherQuizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');
        let visibilityInfo = quiz.visibility.charAt(0).toUpperCase() + quiz.visibility.slice(1);
        if (quiz.visibility === 'unlisted' && quiz.unlistedLink) {
            visibilityInfo += ` (<a href="${quiz.unlistedLink}" target="_blank" onclick="event.stopPropagation();">Link</a> <button onclick="copyTeacherQuizLink('${quiz.unlistedLink}', event)" style="padding:2px 5px; font-size:0.8em;">Copy</button>)`;
        }

        quizItem.innerHTML = `
            <div>
                <span class="quiz-item-title">${quiz.title}</span><br>
                <small>Difficulty: ${quiz.difficulty}, Visibility: ${visibilityInfo}, Questions: ${quiz.questions.length}</small>
            </div>
            <div class="quiz-item-actions">
                <button class="edit-button" onclick="editQuiz('${quiz.id}')">Edit</button>
                <button class="delete-button" onclick="deleteQuiz('${quiz.id}')">Delete</button>
                <button onclick="viewSubmissions('${quiz.id}')" title="View Submissions (placeholder)">Submissions</button>
            </div>
        `;
        container.appendChild(quizItem);
    });
}

function copyTeacherQuizLink(link, event) {
    event.stopPropagation(); // Prevent navigation if the link itself is clicked
    navigator.clipboard.writeText(link).then(() => {
        alert('Unlisted quiz link copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy link. Please copy it manually.');
        console.error('Could not copy text: ', err);
    });
}


function processDeleteQuiz(quizId, deleterRole = 'teacher') { // deleterRole can be 'teacher' or 'admin'
    let quizzes = getAllQuizzes();
    const quizIndex = quizzes.findIndex(q => q.id === quizId);

    if (quizIndex === -1) {
        alert('Error: Quiz not found.');
        return;
    }

    const currentUser = getCurrentUser();
    // Authorization check
    if (deleterRole === 'teacher' && quizzes[quizIndex].createdBy !== currentUser.userId) {
        alert('Error: You can only delete your own quizzes.');
        return;
    }
    if (deleterRole === 'admin' && currentUser.accountType !== 'admin') {
        alert('Error: Insufficient permissions.');
        return;
    }


    quizzes.splice(quizIndex, 1);
    localStorage.setItem('mozgOnFireQuizzes', JSON.stringify(quizzes));
    alert('Quiz deleted successfully.');

    // Refresh the list
    if (deleterRole === 'admin' && window.loadAllQuizzesForAdmin) {
        loadAllQuizzesForAdmin();
    } else if (deleterRole === 'teacher' && window.loadTeacherQuizzes) {
        loadTeacherQuizzes();
    }
    // Also refresh admin list if admin deleted it from teacher's view (edge case, better to handle on admin page)
    if (document.getElementById('allQuizzesContainer') && typeof loadAllQuizzesForAdmin === 'function') {
        loadAllQuizzesForAdmin();
    }
}


// --- ADMIN DASHBOARD FUNCTIONS ---
function loadAllUsersForAdmin() {
    const users = getAllUsers(); // From auth.js
    const container = document.getElementById('allUsersContainer');
    container.innerHTML = ''; // Clear loading

    if (users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
    }
    
    const currentUser = getCurrentUser(); // To prevent admin from banning themselves easily

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-item');
        let actionsHtml = '';
        if (currentUser.userId !== user.id) { // Admin cannot ban or easily change own role from this UI
             actionsHtml = `
                <button class="ban-button" onclick="banUser('${user.id}')">${user.isBanned ? 'Unban' : 'Ban'} User</button>
                <button class="role-button" onclick="changeUserRole('${user.id}', '${user.accountType}')">Change Role</button>
            `;
        } else {
            actionsHtml = '<span>(Current Admin)</span>';
        }

        userItem.innerHTML = `
            <div>
                <span class="user-name">${user.firstName} ${user.lastName} (${user.email})</span><br>
                <small>Role: ${user.accountType} ${user.isBanned ? '<strong>(BANNED)</strong>' : ''}</small>
            </div>
            <div class="user-actions">
                ${actionsHtml}
            </div>
        `;
        container.appendChild(userItem);
    });
}

function processUserBan(userId) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        users[userIndex].isBanned = !users[userIndex].isBanned; // Toggle ban status
        localStorage.setItem('mozgOnFireUsers', JSON.stringify(users));
        alert(`User ${users[userIndex].isBanned ? 'banned' : 'unbanned'} successfully.`);
        loadAllUsersForAdmin(); // Refresh list
    } else {
        alert('Error: User not found.');
    }
}

function processUserRoleChange(userId, newRole) {
    if (updateUser(userId, { accountType: newRole })) { // updateUser is in auth.js
        alert('User role updated successfully.');
        loadAllUsersForAdmin(); // Refresh list
    } else {
        alert('Error: Could not update user role.');
    }
}

function loadAllQuizzesForAdmin() {
    const quizzes = getAllQuizzes();
    const container = document.getElementById('allQuizzesContainer');
    container.innerHTML = ''; // Clear loading

    if (quizzes.length === 0) {
        container.innerHTML = '<p>No quizzes found in the system.</p>';
        return;
    }

    const users = getAllUsers(); // To display creator's name

    quizzes.forEach(quiz => {
        const creator = users.find(u => u.id === quiz.createdBy);
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown';
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');
        quizItem.innerHTML = `
            <div>
                <span class="quiz-item-title">${quiz.title}</span> (by ${creatorName})<br>
                <small>Difficulty: ${quiz.difficulty}, Visibility: ${quiz.visibility}, Questions: ${quiz.questions.length}</small>
            </div>
            <div class="quiz-item-actions">
                <button class="edit-button" onclick="editQuiz('${quiz.id}')">Edit</button> <!-- editQuiz is global from teacher_dashboard inline script -->
                <button class="delete-button" onclick="deleteQuizAsAdmin('${quiz.id}')">Delete Quiz</button>
            </div>
        `;
        container.appendChild(quizItem);
    });
}

function loadConversionRequests() {
    const requests = getConversionRequests();
    const container = document.getElementById('conversionRequestsContainer');
    container.innerHTML = '';

    const pendingRequests = requests.filter(r => r.status === 'pending');

    if (pendingRequests.length === 0) {
        container.innerHTML = '<p>No pending account conversion requests.</p>';
        return;
    }

    const users = getAllUsers();

    pendingRequests.forEach(req => {
        const user = users.find(u => u.id === req.userId);
        if (!user) return; // Skip if user not found

        const requestItem = document.createElement('div');
        requestItem.classList.add('request-item');
        requestItem.innerHTML = `
            <div>
                <span class="request-user">${user.firstName} ${user.lastName} (${user.email})</span> requests Teacher Account.<br>
                <small>Reason/School: ${req.reason || 'N/A (Form needs update)'} | Submitted: ${new Date(req.requestedAt).toLocaleDateString()}</small>
            </div>
            <div class="request-actions">
                <button class="approve-button" onclick="processConversionRequest('${req.id}', 'approved')">Approve</button>
                <button class="reject-button" onclick="processConversionRequest('${req.id}', 'rejected')">Reject</button>
            </div>
        `;
        container.appendChild(requestItem);
    });
}

function processConversionRequest(requestId, newStatus) { // newStatus: 'approved' or 'rejected'
    let requests = getConversionRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) {
        alert('Error: Request not found.');
        return;
    }

    const currentUser = getCurrentUser();
    if (currentUser.accountType !== 'admin' && currentUser.accountType !== 'moderator') {
        alert('Error: Insufficient permissions.');
        return;
    }

    requests[requestIndex].status = newStatus;
    requests[requestIndex].processedBy = currentUser.userId;
    requests[requestIndex].processedAt = new Date().toISOString();

    if (newStatus === 'approved') {
        if (!updateUser(requests[requestIndex].userId, { accountType: 'teacher' })) {
            alert('Error updating user role, but request status changed. Please check user manually.');
        } else {
             alert('Request approved and user role updated to Teacher.');
        }
    } else {
        alert('Request rejected.');
    }

    saveConversionRequests(requests);
    loadConversionRequests(); // Refresh list
    if (typeof loadAllUsersForAdmin === 'function') loadAllUsersForAdmin(); // Refresh user list if admin is viewing
}


// --- QUIZ SOLVING & SUBMISSION ---
// These will be primarily used by quiz_solve.html but are placed here for organization

function loadQuizForSolving(quizId) {
    const quiz = getAllQuizzes().find(q => q.id === quizId);
    if (!quiz) {
        document.getElementById('quizSolveContainer').innerHTML = '<h2>Quiz not found or not accessible.</h2>';
        return null;
    }

    // Check visibility (basic check, more robust needed for unlisted with tokens)
    const currentUser = getCurrentUser();
    if (quiz.visibility === 'private' && (!currentUser || quiz.createdBy !== currentUser.userId /* and not assigned */)) {
        // This check is simplistic. Private quizzes would need an assignment system.
        // For now, only creator can "preview" their private quiz this way.
        // document.getElementById('quizSolveContainer').innerHTML = '<h2>This quiz is private.</h2>';
        // return null; // Allow if creator for testing
    }
     if (quiz.visibility === 'unlisted') {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!quiz.unlistedLink || !quiz.unlistedLink.includes(token)) {
            document.getElementById('quizSolveContainer').innerHTML = '<h2>Invalid link for unlisted quiz.</h2>';
            return null;
        }
    }


    document.getElementById('quizTitle').textContent = quiz.title;
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = '';

    quiz.questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-container');
        questionDiv.innerHTML = `<p class="question-text"><strong>Q${index + 1}:</strong> ${q.text}</p>`;
        
        const answersList = document.createElement('div');
        answersList.classList.add('answers-list');
        
        q.answers.forEach((ans, ansIndex) => {
            const inputType = (q.type === 'multiple-choice-single' || q.type === 'true-false') ? 'radio' : 'checkbox';
            const answerId = `q${index}_ans${ansIndex}`;
            const label = document.createElement('label');
            label.setAttribute('for', answerId);
            label.innerHTML = `
                <input type="${inputType}" name="question_${index}" id="${answerId}" value="${ans.text}">
                ${ans.text}
            `;
            answersList.appendChild(label);
        });
        questionDiv.appendChild(answersList);
        questionsContainer.appendChild(questionDiv);
    });
    return quiz; // Return the quiz data for submission processing
}

function submitQuizAnswers(quizData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert("You must be logged in to submit a quiz.");
        // Potentially redirect to login
        return;
    }

    let score = 0;
    let totalQuestions = quizData.questions.length;
    const userAnswers = [];

    quizData.questions.forEach((q, index) => {
        const questionGroup = document.getElementsByName(`question_${index}`);
        const selectedAnswers = [];
        questionGroup.forEach(input => {
            if (input.checked) {
                selectedAnswers.push(input.value);
            }
        });

        userAnswers.push({ questionId: q.id, answers: selectedAnswers });

        // Scoring logic
        let isCorrect = false;
        if (q.type === 'multiple-choice-single' || q.type === 'true-false') {
            if (selectedAnswers.length === 1 && q.correctAnswers.includes(selectedAnswers[0])) {
                isCorrect = true;
            }
        } else if (q.type === 'multiple-choice-multiple') {
            // Strict: all correct answers must be selected, and no incorrect ones.
            if (selectedAnswers.length === q.correctAnswers.length) {
                isCorrect = q.correctAnswers.every(ca => selectedAnswers.includes(ca));
            }
        }
        if (isCorrect) {
            score++;
        }
    });

    const submission = {
        id: `sub_${Date.now()}_${currentUser.userId.slice(-4)}`,
        quizId: quizData.id,
        quizTitle: quizData.title,
        userId: currentUser.userId,
        userFirstName: currentUser.firstName,
        userLastName: currentUser.lastName,
        answers: userAnswers,
        score: score,
        totalQuestions: totalQuestions,
        percentage: totalQuestions > 0 ? (score / totalQuestions) * 100 : 0,
        submittedAt: new Date().toISOString()
    };

    let submissions = getAllQuizSubmissions();
    submissions.push(submission);
    saveAllQuizSubmissions(submissions);

    // Display results
    const resultsContainer = document.getElementById('quizSolveContainer'); // Reuse container
    resultsContainer.innerHTML = `
        <h2>Quiz Submitted!</h2>
        <h3>Your Score: ${score} / ${totalQuestions} (${submission.percentage.toFixed(1)}%)</h3>
        <p>Thank you for completing the quiz, ${currentUser.firstName}!</p>
        <div id="leaderboardForQuiz"></div>
        <button onclick="window.location.href='student_dashboard.html'" class="cta-button" style="margin-top:1rem;">Back to Dashboard</button>
    `;
    displayLeaderboard(quizData.id, 'leaderboardForQuiz');
}

function displayLeaderboard(quizId, containerId) {
    const submissions = getAllQuizSubmissions().filter(sub => sub.quizId === quizId);
    const leaderboardContainer = document.getElementById(containerId);

    if (!leaderboardContainer) return;
    leaderboardContainer.innerHTML = '<h3>Leaderboard</h3>';

    if (submissions.length === 0) {
        leaderboardContainer.innerHTML += '<p>No submissions yet for this quiz.</p>';
        return;
    }

    // Sort by score (descending), then by time (ascending) for ties
    submissions.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

    const ol = document.createElement('ol');
    submissions.slice(0, 10).forEach(sub => { // Top 10
        const li = document.createElement('li');
        li.innerHTML = `${sub.userFirstName} ${sub.userLastName.charAt(0)}. - <span class="score">${sub.score}/${sub.totalQuestions}</span>`;
        ol.appendChild(li);
    });
    leaderboardContainer.appendChild(ol);
}