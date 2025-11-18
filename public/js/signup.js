// Function to remove the error message when user starts typing
function removeFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.color = '#495057';
        field.style.backgroundColor = '#fff';
        field.style.border = '1px solid #8bbafe';
        field.style.outline = 'none';
        field.style.boxShadow = '0 0 0 .2rem rgba(13, 110, 253, 0.25)';
        field.style.boxShadow = 'none';
    }
    const errorDiv = document.getElementById(fieldId + '-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Add event listeners to remove error on input
['username', 'email', 'password'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
        field.addEventListener('input', () => removeFieldError(fieldId));
    }
});

// Fetch the API URL from the backend
async function getApiUrl() {
    const response = await fetch('/api/config');
    const data = await response.json();
    return data.apiUrl;
}

// Get groupId from URL params
const urlSearchParams = new URLSearchParams(window.location.search);
const groupId = urlSearchParams.get('groupId');
console.log(groupId);

if (groupId) {
    const userExists = window.confirm('If you already have an account, then login to join the group. Click "Cancel" to create a new account.');
    if (userExists) {
        window.location.href = `login.html?groupId=${groupId}`;
    }
}

// Function to show field error message
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.border = '1px solid #f56565';
        field.style.boxShadow = '0 0 5px #f56565';
    }

    const errorDiv = document.getElementById(fieldId + '-error');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Save function to handle signup form submission
const save = async (event) => {
    try {
        event.preventDefault();
        const name = event.target.username.value;
        const email = event.target.email.value;
        const password = event.target.password.value;

        const obj = { name, email, password };
        let apiUrl = await getApiUrl();
        console.log(apiUrl);

        let response;
        if (groupId) {
            response = await axios.post(`${apiUrl}/user/signup?groupId=${groupId}`, obj);
        } else {
            response = await axios.post(`${apiUrl}/user/signup`, obj);
        }

        console.log(response);
        if (response.data.groupDetails !== null) {
            localStorage.setItem('groupid', response.data.groupDetails.id);
            localStorage.setItem('groupName', response.data.groupDetails.groupName);
        }
        
        localStorage.setItem('name', response.data.name);
        localStorage.setItem('token', response.data.token);

        if (groupId !== null) {
            localStorage.removeItem('link');
            window.location.href = `group-chat.html?groupId=${groupId}`;
        } else {
            window.location.href = `group-chat.html`;
        }
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            const errorMessage = error.response.data.error.toLowerCase();
            if (errorMessage.includes('user already exists') || errorMessage.includes('email')) {
                showFieldError('email', 'User with this email already exists');
            } else if (errorMessage.includes('password')) {
                showFieldError('password', errorMessage);
            } else if (errorMessage.includes('name')) {
                showFieldError('username', errorMessage);
            } else {
                const generalErrorDiv = document.getElementById('general-error');
                if (generalErrorDiv) {
                    generalErrorDiv.textContent = 'An error occurred. Please try again';
                }
            }
        }
    }
};
