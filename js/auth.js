// Authentication script for MózgOnFire

// {id: "user_1748409827735_4u8tq", firstName: "admin", lastName: "admin", email: "admin@admin.admin",…}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // --- REGISTRATION ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = registerForm.firstName.value.trim();
            const lastName = registerForm.lastName.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            const termsAgreed = registerForm.terms.checked;

            // Basic Validations
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                alert('Please fill in all fields.');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }
            if (!termsAgreed) {
                alert('You must agree to the Terms and Conditions.');
                return;
            }

            // Simulate backend processing
            try {
                // In a real app, this would be an API call
                let users = JSON.parse(localStorage.getItem('mozgOnFireUsers')) || [];

                // Check if user already exists
                if (users.find(user => user.email === email)) {
                    alert('An account with this email already exists.');
                    return;
                }

                const newUser = {
                    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    firstName,
                    lastName,
                    email,
                    password, // In a real app, hash the password before storing
                    accountType: 'student', // Default account type
                    createdAt: new Date().toISOString()
                };

                users.push(newUser);
                localStorage.setItem('mozgOnFireUsers', JSON.stringify(users));

                alert('Registration successful! Please login.');
                window.location.href = 'login.html'; // Redirect to login page

            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }

    // --- LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }

            try {
                let users = JSON.parse(localStorage.getItem('mozgOnFireUsers')) || [];
                const user = users.find(u => u.email === email);

                if (!user) {
                    alert('No account found with this email.');
                    return;
                }

                // In a real app, compare hashed passwords
                if (user.password !== password) {
                    alert('Incorrect password.');
                    return;
                }

                // Simulate session/token creation
                const sessionData = {
                    userId: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    accountType: user.accountType,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('mozgOnFireSession', JSON.stringify(sessionData));

                alert('Login successful!');

                // Redirect based on account type
                if (user.accountType === 'student') {
                    window.location.href = 'student_dashboard.html';
                } else if (user.accountType === 'teacher') {
                    window.location.href = 'teacher_dashboard.html';
                } else if (user.accountType === 'admin') {
                    window.location.href = 'admin_dashboard.html';
                } else {
                    // Fallback, though ideally all users have a defined type
                    window.location.href = 'index.html';
                }

            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }

    // --- LOGOUT FUNCTIONALITY (can be called from anywhere) ---
    window.logoutUser = function() {
        localStorage.removeItem('mozgOnFireSession');
        alert('You have been logged out.');
        window.location.href = 'login.html';
    };

    // --- CHECK LOGIN STATE & UPDATE NAV ---
    // This function can be called on pages that require authentication
    // or to dynamically update navigation links.
    window.updateNavBasedOnLogin = function() {
        const session = JSON.parse(localStorage.getItem('mozgOnFireSession'));
        const navUl = document.querySelector('header nav ul');

        if (!navUl) return;

        // Clear existing links beyond the logo
        const logo = navUl.parentElement.querySelector('.logo');
        navUl.innerHTML = ''; // Clear existing items

        if (session) {
            // User is logged in
            navUl.innerHTML += `<li><a href="index.html">Home</a></li>`;
            if (session.accountType === 'student') {
                navUl.innerHTML += `<li><a href="student_dashboard.html">Dashboard</a></li>`;
            } else if (session.accountType === 'teacher') {
                navUl.innerHTML += `<li><a href="teacher_dashboard.html">Dashboard</a></li>`;
            } else if (session.accountType === 'admin') {
                navUl.innerHTML += `<li><a href="admin_dashboard.html">Admin Panel</a></li>`;
            }
            navUl.innerHTML += `<li><a href="settings.html">Settings</a></li>`;
            navUl.innerHTML += `<li><a href="#" onclick="logoutUser()">Logout (${session.firstName})</a></li>`;
        } else {
            // User is logged out
            navUl.innerHTML += `<li><a href="index.html">Home</a></li>`;
            navUl.innerHTML += `<li><a href="login.html">Login</a></li>`;
            navUl.innerHTML += `<li><a href="register.html">Register</a></li>`;
        }
    };

    // Call it on page load for relevant pages
    // We'll need to add this call to the <script> tag in HTML files
    // or ensure this script runs after the nav is loaded.
    // For now, it's defined. We'll integrate it into HTMLs later.
    if (document.querySelector('header nav ul')) {
         updateNavBasedOnLogin();
    }

});

// Helper function to get current logged-in user (if any)
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('mozgOnFireSession'));
}

// Helper function to get all users (for admin/teacher purposes)
function getAllUsers() {
    return JSON.parse(localStorage.getItem('mozgOnFireUsers')) || [];
}

// Helper function to update a user's details (e.g., account type)
function updateUser(userId, updatedDetails) {
    let users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        users[userIndex] = { ...users[userIndex], ...updatedDetails };
        localStorage.setItem('mozgOnFireUsers', JSON.stringify(users));

        // If the updated user is the currently logged-in user, update session too
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.userId === userId) {
            localStorage.setItem('mozgOnFireSession', JSON.stringify({ ...currentUser, ...updatedDetails }));
        }
        return true;
    }
    return false;
}