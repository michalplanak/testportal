// Quiz Generator Script for MózgOnFire

document.addEventListener('DOMContentLoaded', () => {
    // This event listener is a bit redundant as the core logic is in initializeQuizForm,
    // called from the inline script in quiz_generator.html.
    // However, it's good practice for scripts that might be loaded independently.
});

let questionCounter = 0;
let editModeQuizId = null;

function initializeQuizForm() {
    const quizForm = document.getElementById('quizForm');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const questionsContainer = document.getElementById('questionsContainer');
    const pageTitle = document.getElementById('pageTitle');
    const quizIdInput = document.getElementById('quizId');
    const saveQuizBtn = document.getElementById('saveQuizBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const visibilitySelect = document.getElementById('quizVisibility');
    const unlistedLinkContainer = document.getElementById('unlistedLinkContainer');
    const unlistedLinkInput = document.getElementById('unlistedLink');


    // Check for edit mode
    const urlParams = new URLSearchParams(window.location.search);
    editModeQuizId = urlParams.get('edit') || localStorage.getItem('editQuizId');

    if (editModeQuizId) {
        pageTitle.textContent = 'Edit Quiz';
        saveQuizBtn.textContent = 'Update Quiz';
        cancelEditBtn.style.display = 'block';
        quizIdInput.value = editModeQuizId;
        loadQuizForEditing(editModeQuizId);
        localStorage.removeItem('editQuizId'); // Clean up after loading
    } else {
        // Add one default question block for new quizzes
        addQuestionBlock();
    }

    addQuestionBtn.addEventListener('click', () => {
        addQuestionBlock();
    });

    quizForm.addEventListener('submit', saveQuiz);

    visibilitySelect.addEventListener('change', function() {
        if (this.value === 'unlisted') {
            unlistedLinkContainer.style.display = 'block';
            if (!unlistedLinkInput.value && editModeQuizId) { // Populate if editing and link exists
                const quizzes = JSON.parse(localStorage.getItem('mozgOnFireQuizzes')) || [];
                const quizData = quizzes.find(q => q.id === editModeQuizId);
                if (quizData && quizData.unlistedLink) {
                    unlistedLinkInput.value = quizData.unlistedLink;
                } else if (quizData) { // Generate if not existing for an unlisted quiz being edited
                     quizData.unlistedLink = `${window.location.origin}/quiz_solve.html?id=${quizData.id}&token=${generateUnlistedToken()}`;
                     unlistedLinkInput.value = quizData.unlistedLink;
                }
            } else if (!unlistedLinkInput.value) { // Generate for new unlisted quiz
                // Temporary ID, will be replaced on save if new quiz
                const tempId = editModeQuizId || `temp_${Date.now()}`;
                unlistedLinkInput.value = `${window.location.origin}/quiz_solve.html?id=${tempId}&token=${generateUnlistedToken()}`;
            }
        } else {
            unlistedLinkContainer.style.display = 'none';
        }
    });
}

function generateUnlistedToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function addQuestionBlock(questionData = null) {
    questionCounter++;
    const questionsContainer = document.getElementById('questionsContainer');

    const questionBlock = document.createElement('div');
    questionBlock.classList.add('question-block');
    questionBlock.setAttribute('id', `questionBlock-${questionCounter}`);
    questionBlock.innerHTML = `
        <h4>Question ${questionCounter}</h4>
        <div class="form-group">
            <label for="questionText-${questionCounter}">Question Text:</label>
            <input type="text" id="questionText-${questionCounter}" name="questionText-${questionCounter}" value="${questionData ? questionData.text : ''}" required>
        </div>
        <div class="form-group">
            <label for="questionType-${questionCounter}">Question Type:</label>
            <select id="questionType-${questionCounter}" name="questionType-${questionCounter}" class="question-type-select">
                <option value="multiple-choice-single" ${questionData && questionData.type === 'multiple-choice-single' ? 'selected' : ''}>Multiple Choice (Single Answer)</option>
                <option value="multiple-choice-multiple" ${questionData && questionData.type === 'multiple-choice-multiple' ? 'selected' : ''}>Multiple Choice (Multiple Answers)</option>
                <option value="true-false" ${questionData && questionData.type === 'true-false' ? 'selected' : ''}>True/False</option>
                <!-- <option value="short-answer">Short Answer (Manual Grading)</option> -->
            </select>
        </div>
        <div id="answersContainer-${questionCounter}" class="answers-container">
            <!-- Answers will be added here -->
        </div>
        <button type="button" class="add-answer-btn" data-question-id="${questionCounter}">Add Answer Option</button>
        <button type="button" class="remove-question-btn" data-question-id="${questionCounter}" style="background-color: #dc3545; margin-left:5px;">Remove Question</button>
    `;

    questionsContainer.appendChild(questionBlock);

    const questionTypeSelect = questionBlock.querySelector(`#questionType-${questionCounter}`);
    const answersContainer = questionBlock.querySelector(`#answersContainer-${questionCounter}`);
    const addAnswerBtn = questionBlock.querySelector('.add-answer-btn');
    const removeQuestionBtn = questionBlock.querySelector('.remove-question-btn');

    // Initialize answers based on question type and data
    updateAnswerOptions(questionTypeSelect, answersContainer, questionCounter, questionData ? questionData.answers : null, questionData ? questionData.correctAnswers : null);

    questionTypeSelect.addEventListener('change', () => {
        updateAnswerOptions(questionTypeSelect, answersContainer, questionCounter);
    });

    addAnswerBtn.addEventListener('click', () => {
        addAnswerOption(answersContainer, questionTypeSelect.value, questionCounter);
    });

    removeQuestionBtn.addEventListener('click', () => {
        if (questionsContainer.children.length > 1) {
            questionBlock.remove();
            // Renumber questions if needed (optional, could just leave gaps or re-evaluate on save)
        } else {
            alert('A quiz must have at least one question.');
        }
    });

    // If editing, populate answers
    if (questionData && questionData.answers) {
        answersContainer.innerHTML = ''; // Clear default/previous before populating
        questionData.answers.forEach((answer, index) => {
            const isCorrect = questionData.correctAnswers ? questionData.correctAnswers.includes(answer.text) || (questionData.correctAnswers.includes(index.toString()) && questionData.type !== 'true-false') || (questionData.type === 'true-false' && questionData.correctAnswers[0].toString().toLowerCase() === answer.text.toString().toLowerCase()): false;
            addAnswerOption(answersContainer, questionData.type, questionCounter, answer.text, isCorrect);
        });
        // Ensure True/False has its fixed options if not already added by loop
        if (questionData.type === 'true-false' && answersContainer.children.length === 0) {
             updateAnswerOptions(questionTypeSelect, answersContainer, questionCounter, null, questionData.correctAnswers);
        }
    }
}


function updateAnswerOptions(typeSelectElement, answersContainer, qId, existingAnswers = null, correctAnswers = null) {
    answersContainer.innerHTML = ''; // Clear existing options
    const questionType = typeSelectElement.value;

    if (questionType === 'multiple-choice-single' || questionType === 'multiple-choice-multiple') {
        if (existingAnswers && existingAnswers.length > 0) {
            existingAnswers.forEach(ans => {
                 const isCorrect = correctAnswers ? correctAnswers.includes(ans.text) : false;
                 addAnswerOption(answersContainer, questionType, qId, ans.text, isCorrect);
            });
        } else { // Add a few default options if new
            addAnswerOption(answersContainer, questionType, qId);
            addAnswerOption(answersContainer, questionType, qId);
        }
        answersContainer.nextElementSibling.style.display = 'inline-block'; // Show "Add Answer Option"
    } else if (questionType === 'true-false') {
        addAnswerOption(answersContainer, questionType, qId, 'True', correctAnswers ? correctAnswers[0] === 'True' || correctAnswers[0] === true : false);
        addAnswerOption(answersContainer, questionType, qId, 'False', correctAnswers ? correctAnswers[0] === 'False' || correctAnswers[0] === false : false);
        answersContainer.nextElementSibling.style.display = 'none'; // Hide "Add Answer Option"
    }
}

let answerOptionCounter = 0; // Global or per question? Let's try per question for simplicity in removal.

function addAnswerOption(answersContainer, questionType, qId, value = '', isCorrect = false) {
    answerOptionCounter++; // Unique ID for the input elements
    const optionDiv = document.createElement('div');
    optionDiv.classList.add('answer-option');

    const inputType = (questionType === 'multiple-choice-single' || questionType === 'true-false') ? 'radio' : 'checkbox';
    
    optionDiv.innerHTML = `
        <input type="${inputType}" 
               name="correctAnswer-${qId}" 
               id="answerInput-${qId}-${answerOptionCounter}" 
               value="${value || `Option ${answerOptionCounter}`}" 
               ${isCorrect ? 'checked' : ''}>
        <input type="text" 
               class="answer-text" 
               placeholder="Answer text" 
               value="${value}" 
               ${questionType === 'true-false' ? 'readonly' : ''}>
        ${questionType !== 'true-false' ? '<button type="button" class="remove-answer-btn" style="background-color:#6c757d; padding: 0.2rem 0.5rem; font-size:0.8rem;">X</button>' : ''}
    `;

    answersContainer.appendChild(optionDiv);

    const textInput = optionDiv.querySelector('.answer-text');
    const radioCheckboxInput = optionDiv.querySelector(`input[type="${inputType}"]`);

    // Update radio/checkbox value when text changes (for multiple choice)
    if (questionType !== 'true-false') {
        textInput.addEventListener('input', () => {
            radioCheckboxInput.value = textInput.value;
        });
         optionDiv.querySelector('.remove-answer-btn').addEventListener('click', () => {
            if (answersContainer.children.length > 1) { // Keep at least one option for MCQs
                optionDiv.remove();
            } else {
                alert('A question must have at least one answer option.');
            }
        });
    } else {
        // For True/False, the value is fixed, text input is readonly
        radioCheckboxInput.value = value; // Ensure 'True' or 'False'
    }
}


function loadQuizForEditing(quizId) {
    const quizzes = JSON.parse(localStorage.getItem('mozgOnFireQuizzes')) || [];
    const quizData = quizzes.find(q => q.id === quizId);

    if (!quizData) {
        alert('Quiz not found for editing.');
        window.location.href = 'teacher_dashboard.html';
        return;
    }

    document.getElementById('quizTitle').value = quizData.title;
    document.getElementById('quizDescription').value = quizData.description || '';
    document.getElementById('quizDifficulty').value = quizData.difficulty;
    document.getElementById('quizVisibility').value = quizData.visibility;
    
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = ''; // Clear any default
    questionCounter = 0; // Reset counter

    quizData.questions.forEach(qData => {
        addQuestionBlock(qData);
    });

    // Trigger change for visibility to show unlisted link if applicable
    const visibilitySelect = document.getElementById('quizVisibility');
    visibilitySelect.dispatchEvent(new Event('change'));
     if (quizData.visibility === 'unlisted' && quizData.unlistedLink) {
        document.getElementById('unlistedLink').value = quizData.unlistedLink;
    }
}

function saveQuiz(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert("You must be logged in to save a quiz.");
        return;
    }

    const quizId = document.getElementById('quizId').value || `quiz_${Date.now()}_${currentUser.userId.substring(currentUser.userId.length - 4)}`;
    const title = document.getElementById('quizTitle').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const difficulty = document.getElementById('quizDifficulty').value;
    const visibility = document.getElementById('quizVisibility').value;
    let unlistedLink = null;

    if (visibility === 'unlisted') {
        const linkInput = document.getElementById('unlistedLink');
        if (!linkInput.value || !linkInput.value.includes('token=')) { // Ensure token is part of it
            linkInput.value = `${window.location.origin}/quiz_solve.html?id=${quizId}&token=${generateUnlistedToken()}`;
        }
        unlistedLink = linkInput.value;
    }


    if (!title) {
        alert('Quiz title is required.');
        return;
    }

    const questions = [];
    const questionBlocks = document.querySelectorAll('.question-block');

    if (questionBlocks.length === 0) {
        alert('A quiz must have at least one question.');
        return;
    }

    let formIsValid = true;
    questionBlocks.forEach((block, index) => {
        const qId = block.id.split('-')[1]; // Extract the counter part of the ID
        const questionText = block.querySelector(`#questionText-${qId}`).value.trim();
        const questionType = block.querySelector(`#questionType-${qId}`).value;
        
        if (!questionText) {
            alert(`Question ${parseInt(qId)} text is required.`);
            formIsValid = false;
            return;
        }

        const answers = [];
        const correctAnswers = [];
        const answerOptions = block.querySelectorAll('.answer-option');

        if (answerOptions.length === 0 && (questionType === 'multiple-choice-single' || questionType === 'multiple-choice-multiple')) {
            alert(`Question ${parseInt(qId)} must have at least one answer option.`);
            formIsValid = false;
            return;
        }
        
        let hasSelectedAnswer = false;

        answerOptions.forEach(opt => {
            const textInput = opt.querySelector('.answer-text');
            const choiceInput = opt.querySelector('input[type="radio"], input[type="checkbox"]');
            const answerText = textInput.value.trim();

            if (!answerText && questionType !== 'true-false') { // True/False has fixed text
                alert(`Answer text for an option in Question ${parseInt(qId)} is required.`);
                formIsValid = false;
                return;
            }
            answers.push({ text: answerText });
            if (choiceInput.checked) {
                correctAnswers.push(answerText); // Store the text of the correct answer
                hasSelectedAnswer = true;
            }
        });

        if (!hasSelectedAnswer && (questionType === 'multiple-choice-single' || questionType === 'true-false')) {
            alert(`Question ${parseInt(qId)} must have a correct answer selected.`);
            formIsValid = false;
            return;
        }
         if (!hasSelectedAnswer && questionType === 'multiple-choice-multiple' && answerOptions.length > 0) {
            alert(`Question ${parseInt(qId)} (multiple answers) must have at least one correct answer selected.`);
            formIsValid = false;
            return;
        }


        if (!formIsValid) return;

        questions.push({
            id: `q_${quizId}_${index + 1}`,
            text: questionText,
            type: questionType,
            answers: answers,
            correctAnswers: correctAnswers // For multiple choice, this is an array of strings. For T/F, it's ['True'] or ['False']
        });
    });

    if (!formIsValid) {
        return;
    }

    const quizData = {
        id: quizId,
        title,
        description,
        difficulty,
        visibility,
        unlistedLink: visibility === 'unlisted' ? unlistedLink : null,
        questions,
        createdBy: currentUser.userId,
        createdAt: editModeQuizId ? (JSON.parse(localStorage.getItem('mozgOnFireQuizzes')).find(q=>q.id === editModeQuizId).createdAt) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    let quizzes = JSON.parse(localStorage.getItem('mozgOnFireQuizzes')) || [];
    if (editModeQuizId) {
        const existingIndex = quizzes.findIndex(q => q.id === editModeQuizId);
        if (existingIndex > -1) {
            quizzes[existingIndex] = quizData;
        } else { // Should not happen if loaded correctly
            quizzes.push(quizData);
        }
    } else {
        quizzes.push(quizData);
    }

    localStorage.setItem('mozgOnFireQuizzes', JSON.stringify(quizzes));
    alert(`Quiz ${editModeQuizId ? 'updated' : 'saved'} successfully!`);
    
    // Clear editQuizId from localStorage if it was set
    localStorage.removeItem('editQuizId');
    
    if (currentUser.accountType === 'admin') {
        window.location.href = 'admin_dashboard.html';
    } else {
        window.location.href = 'teacher_dashboard.html';
    }
}