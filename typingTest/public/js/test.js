//deploy this would be nice
const submitButton = document.getElementById("submit");
const typeHere = document.getElementById("typeHere");
const displayText = document.getElementById("display");
const displayTime = document.getElementById("time");
const displayRawWPM = document.getElementById("rawWPM");
const displayAdjustedWPM = document.getElementById("adjustedWPM");
const displayAccuracy = document.getElementById("accuracy");
const saveButton = document.getElementById("save");

let chosenPhrase;    
let startTime;
let endTime;
let testStarted = false;

submitButton.addEventListener("click", submit);
typeHere.addEventListener("click", startTest);
document.addEventListener("keydown", kbShortcut);

typeHere.addEventListener("focus", () => {
    if (!testStarted) {
        typeHere.value = "";
    }
});

function hightlightInput() {
    
    if (!testStarted) return; // Only allow feedback when the test is running

    const typedText = typeHere.value;
    let feedbackHTML = "";

    for (let i = 0; i < chosenPhrase.length; i++) {
        if (i < typedText.length) {
            if (typedText[i] === chosenPhrase[i]) {
                // corect and within range
                //add a span?? lmfao
                //adding direct HTML is wild
                feedbackHTML += `<span class="correct">${chosenPhrase[i]}</span>`;
            } else {
                feedbackHTML += `<span class="incorrect"">${chosenPhrase[i]}</span>`;
            }
        } else {
                feedbackHTML += `<span class="remaining">${chosenPhrase[i]}</span>`;
        }
    }
    displayText.innerHTML = feedbackHTML;
}

typeHere.addEventListener("input", hightlightInput);

function getQuote() {
    return fetch('quotes.json').then(response => response.json())
        .then(data => {
            const quotes = data;
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            return randomQuote; 
        }).catch(error => {
            console.error("Error loading quotes: ", error);
            return null;
        });
}

function updateUI (duration = 0.0, accuracy = 0, rawWPM = 0, adjustedWPM = 0){
    displayTime.textContent = `typed in ${duration.toFixed(2)} seconds`;
    displayRawWPM.textContent = `raw: ${rawWPM.toFixed(2)}`;
    displayAdjustedWPM.textContent = `adjusted: ${adjustedWPM.toFixed(2)}`;
    displayAccuracy.textContent = `accuracy: ${(accuracy*100).toFixed(2)}%`;
}
let duration;
let accuracy; 
let rawWPM; 
let adjustedWPM; 
let newScoreReady = false;

function submit() {
    if (!testStarted) {
        console.log("No test in progress");
        return;
    }
    testStarted = false;
    newScoreReady = true;

    console.log("submitted!");
    endTime = new Date();
    duration = (endTime - startTime)/1000;
    accuracy = calculateAccuracy(typeHere.value, chosenPhrase);
    rawWPM = calculateWPM(chosenPhrase, duration);
    adjustedWPM = calculateWPM(chosenPhrase, duration, accuracy);
    updateUI(duration, accuracy, rawWPM, adjustedWPM);

    // surely a better way to change just a variable in js/html
    typeHere.value="";
    displayText.textContent ="Click to run another test";
}


function startTest() {
    if (!testStarted) {
        getQuote().then(quote => {
            if (quote) {
                chosenPhrase = quote;
                displayText.textContent = chosenPhrase;
                console.log("starting test!");
                startTime = new Date();
            } else {
                chosenPhrase = ":(";
            }
        });
    }
    updateUI();
    testStarted = true;
}

function kbShortcut(event) {
    if (event.key === "Enter") {
        submit();
    } else if (event.key == "Tab") {
        // new test (could be new function?)
        typeHere.value = ""
        testStarted = false;
        startTest();
    }
}

function calculateAccuracy(input, phrase) {
    let correctCharacters = 0;
    // a lot can be improved here
    // for example, if "don't" is spelled "dont", then every character after will be "wrong"
    // or if more characters than phrase are typed
    for (let i = 0; i < phrase.length; i++) {
        if (input[i] == phrase[i]) {
            correctCharacters++;
        }
    }
    return (correctCharacters / phrase.length); // returns accuracy as a decimal to be used in calculateWPM 
}

function calculateWPM(phrase, time, accuracy = 1) {
    let wordCount = phrase.split(" ").length;
    let timeMinutes = time/60; 
    return (wordCount/timeMinutes) * accuracy
}

function newScore() {
    if (!newScoreReady) {
        // prevent from saving multiple times
        return;
    }
    newScoreReady = false;

    const token = localStorage.getItem("token");
    username = JSON.parse(localStorage.getItem("user")).username;
    if (token && username) {
        fetch ("/saveScore", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            //just wpm for simplicity rn
            body: JSON.stringify({ "username": username, "score": adjustedWPM }),
        })
        .then (response => response.json()) 
        .then (data => {
            if (!data.success) {
                console.log("Error saving score: ", data.message);
            } else {
                console.log("scored 'saved'");
                getTopScores(); 
            }
        })
        .catch(error => console.error("Error: ", error));
    } else {
        alert("You must be signed in to save a score. (Other)");
    }
}

saveButton.addEventListener("click", newScore);

function getTopScores() {
    fetch("http://localhost:3000/scores")
    .then((response) => response.json()) 
        .then((scores) => {
            const scoresList = document.getElementById("topScoresList");
            scoresList.innerHTML = ""; // clear previous

            scores.forEach((score) => {
                const scoreItem = document.createElement("li");
                console.log(typeof score.scores);
                //console.log("scores to log: ", (score.scores));
                scoreItem.textContent = `${score.username}: ${score.max_score.toFixed(2)}`;
                scoresList.appendChild(scoreItem);
            });
        })
        .catch((error) => console.error("Error fetching scores: ", error));
}


