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
['email', 'password'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
        field.addEventListener('input', () => removeFieldError(fieldId));
    }
});

// get the api url
async function getApiUrl() {
  const response = await fetch("/api/config");
  const data = await response.json();
  return data.apiUrl;
}

const urlSearchParams = new URLSearchParams(window.location.search);
const groupId = urlSearchParams.get("groupId");
console.log(groupId);

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.style.border = "1px solid #f56565";
    field.style.boxShadow = "0 0 5px #f56565";
  }

  const errorDiv = document.getElementById(fieldId + "-error");

  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

const save = async (event) => {
  try {
    event.preventDefault();

    const email = event.target.email.value;
    const password = event.target.password.value;

    const loginDetails = {
      email,
      password,
    };

    let response;
    const apiUrl = await getApiUrl();

    if (groupId) {
      response = await axios.post(
        `${apiUrl}/user/login?groupId=${groupId}`,
        loginDetails
      );
    } else {
      response = await axios.post(`${apiUrl}/user/login`, loginDetails);
    }

    console.log("response", response);

    if (response.data.groupDetails !== null) {
      console.log(response.data.groupDetails);
      localStorage.setItem("groupid", response.data.groupDetails.id);
      localStorage.setItem("groupName", response.data.groupDetails.groupName);
    }

    //document.getElementById('success').innerHTML = `${response.data.message}`;
    localStorage.setItem("name", response.data.name);
    localStorage.setItem("token", response.data.token);
    //localStorage.setItem('groupName',response.data.groupDetails.groupName);
    if (groupId !== null) {
      localStorage.removeItem("link");
      window.location.href = `group-chat.html?groupId=${groupId}`;
    } else {
      window.location.href = `group-chat.html`;
    }
  } catch (err) {
    console.log(err);
    if (err.response && err.response.data && err.response.data.error) {
      const errorMessage = err.response.data.error;
      // Handle specific error types
      if (errorMessage.toLowerCase().includes("email")) {
        showFieldError("email", "Please enter a valid email address");
      } else if (errorMessage.toLowerCase().includes("authorized")) {
        showFieldError("password", errorMessage);
      } else if (errorMessage.toLowerCase().includes("user not found")) {
        showFieldError("email", "User with this email does not exist");
      } else {
        document.getElementById("general-error").textContent =
          "An error occurred. Please try again.";
      }
    }
  }
};
