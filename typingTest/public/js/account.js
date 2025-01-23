
function handleSignIn(event) {
    event.preventDefault(); // no refresh
    const form = event.target;
    const formData = new FormData(form);

    const username = formData.get("username");
    const password = formData.get("password");

    fetch("/login", {
        method: "POST", //what exactly is a "POST", its just not a get, yeah? 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("succesful log in "); //alert is what?
            form.reset();
            localStorage.setItem("user", JSON.stringify(data.user)); // lmao what? 
            localStorage.setItem("token", JSON.stringify(data.user.token));
            updateGreeting(data.user.username); 
            signinDisplayed = false;
            
            //TODO: not sure if i need the following
            displayAuthButtons();
            location.reload();
            // this is for persistence, yeah?
            // does setItem just have some defaults, where "user" is a type? 
        } else {
            alert("unsuccesful log in. Please try again"); 
        }
    })
    .catch(error => console.error("Error: ", error));
}

//TODO: code can be simplified if forms are on separate pages, but safer maybe? i think its just redundant

function defaultPasswords() {
    const passwordFields = document.getElementById("registerForm").querySelectorAll('input[type="password"]');
    passwordFields.forEach((field) => field.classList.remove("invalid"));
    passwordFields.forEach((field) => field.classList.add("default"));

}

function invalidUsername() {
    const usernameFields = document.getElementById("registerForm").querySelectorAll('input[type="text"]');
    usernameFields.forEach((field) => field.classList.remove("default"));
    usernameFields.forEach((field) => field.classList.add("invalid"));
}

function defaultUsername() {
    const usernameFields = document.getElementById("registerForm").querySelectorAll('input[type="text"]');
    usernameFields.forEach((field) => field.classList.remove("invalid"));
    usernameFields.forEach((field) => field.classList.add("default"));

}

function invalidPasswords() {
    const usernameFields = document.getElementById("registerForm").querySelectorAll('input[type="password"]');
    usernameFields.forEach((field) => field.classList.remove("default"));
    usernameFields.forEach((field) => field.classList.add("invalid"));
}

function handleRegister(event) {
    //this could use some functional decomp
    event.preventDefault(); // no refresh
    const form = event.target;
    const formData = new FormData(form);

    const newUsername = formData.get("newUsername");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    const usernameRegex= /^[a-zA-Z0-9._-]{3,20}$/;
    defaultUsername();
    defaultPasswords();
    
    if (!usernameRegex.test(newUsername)){
        invalidUsername();
        alert("Username must be 3-20 characters long and contain only letters, numbers, underscores, or periods.");
        return; // dont continue if username is invalid
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        invalidPasswords();
        alert("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.");
        return;
    }

    fetch("/register", {
        method: "POST", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ newUsername, newPassword, confirmPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            form.reset();
            displayAuthButtons();
            location.reload();
            registerDisplayed = false;
            
            //alert("succesful register"); 
            //localStorage.setItem("user", JSON.stringify(data.user));}
               //ideally then login but thats not in a function and i don't feel like copying/pasting or making one right now    
        } else {
            switch (data.errorCode) {
                // can choose which error to prioritize here
                // check usernames first
                case "USERNAME_ALREADY_IN_USE":
                    alert(data.message);
                case "INVALID_USERNAME":
                    alert(data.message);
                    invalidUsername();
                    //break; // if i don't break can i get username and password highlighted?
                case "PASSWORDS_DO_NOT_MATCH":
                    alert(data.message);
                    //could alert here but i dont like it lmao 
                    //maybe stylize my alerts in css?
                case "INVALID_PASSWORD":
                    alert(data.message);
                    //somehow not handled by client
                    invalidPasswords();
                    break;
                default: 
                    alert("An unexpected error occured: "+ data.message); 
                }
        }
    })
    .catch(error => console.error("Error: ", error));
}

// welcome message
function updateGreeting(user="guest") {
    document.getElementById("greeting").textContent=`Welcome ${user}!`;
    //document.getElementById("greeting").textContent=`Welcome ${currentUser}!`;
}

const storedUser = localStorage.getItem("user");


let signinDisplayed = false; 
let registerDisplayed = false; 

function displayAuthButtons() {
    updateGreeting();
    //clear in between login?
    const authButtonsContainer = document.getElementById("authButtons");
    authButtonsContainer.innerHTML = '';    
    if (storedUser) { // i think this handles edge cases so its fine to not be, right?
        const user = JSON.parse(storedUser);
        updateGreeting(user.username);

        //if signed in, show log out
        const signOutButton = document.createElement("button");
        signOutButton.textContent = "Sign out";

        signOutButton.addEventListener("click", () => {
            localStorage.removeItem("user");
            alert("successfully logged out");
            location.reload();
            displayAuthButtons();
            updateGreeting();
            // here is where i would in theory return to a login screen
        });
        authButtonsContainer.appendChild(signOutButton);     
        
    } else {
        // gotta be a better way to do this but sue me
        // theres a lot of elements being created each time?
        const signInButton = document.createElement("button");
        const registerMessage = document.createElement("span");
        const registerButton = document.createElement("button");
        signInButton.textContent = "Sign in";
        registerButton.textContent = "register";

        registerButton.addEventListener("click", () => {
            if (!registerDisplayed) { // prevent form from displaying multiple times//DEF a better way to do this that prolly involes multiple html sites but sue me
                if (signinDisplayed) {
                    location.reload(); //TODO UGLY solution to prevent displaying both
                    signinDisplayed = false;
                    //TODO: remove other form in this case
                }
                fetch('register.html')
                    .then(response => response.text())
                    .then(data => {
                        document.body.insertAdjacentHTML('afterbegin', data);
                        document.getElementById("registerForm").addEventListener("submit", handleRegister);
                        registerDisplayed = true; // TODO: prolly a more robust way to ensure the html has been displayed? 
                        // but also its in a try-catch so maybe fine
                })
                .catch(error => console.error('Error loading register form:', error)); 
            }
        });
        //TODO: signin vs signIn consistency
        signInButton.addEventListener("click", () => {
            if (!signinDisplayed) { 
                if (registerDisplayed) {
                    location.reload();
                    registerDisplayed = false;
                }
                fetch('signin.html')
                    .then(response => response.text())  
                    .then(data => {
                        document.body.insertAdjacentHTML('afterbegin', data); 
                        document.getElementById("signInForm").addEventListener("submit", handleSignIn);
                        signinDisplayed = true;
                    })
                    .catch(error => console.error('Error loading sign in form:', error)); 
            }
        });
                authButtonsContainer.appendChild(signInButton);     
                authButtonsContainer.appendChild(registerButton);     
                //displayAuthButtons(); // add to event listener
                //TODO: login should PROLLY just be a different page this is ugly
                //but then i have to reformat code to exist between pages and bruh
    }
}

displayAuthButtons();
