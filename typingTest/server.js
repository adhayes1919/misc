const express = require("express");
const sqlite3 = require("sqlite3").verbose(); 
const bcrypt = require("bcryptjs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
//multiple databases? one for users, one for scores?
const db = new sqlite3.Database("./scores.db");

const SECRET_KEY = "mySecretKey";

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// -----functions ----- //

function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function saveUser(username, hashedPassword) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            [username, hashedPassword],
            function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            }
        );
    });
}

function saveScore(username, newScore) {
    // pretty sure a lot of this is wrong lmao
    return new Promise((resolve, reject) => {
        db.get("SELECT scores FROM users WHERE username = ?", [username], (err, row) => {
            if (err) return reject (err);
            if (!row) return reject(new Error("User not found")); 
                // just to be safe

            // parse the row or empty list if not found?
            const scores = JSON.parse(row.scores || "[]");
            scores.push(newScore);
            console.log("saving to row: ", row);
            db.run(
                "UPDATE users SET scores = ? WHERE username = ?", 
                [JSON.stringify(scores), username], (err) => {
                    if (err) return reject(err);
                    resolve(scores);
                }
                //TODO: will row.id work here?
            );
        });
    }); 
}

// -----end functions ----- //


app.post("/register", async (req, res) => {
    const { newUsername, newPassword, confirmPassword} = req.body;
    //input validation
    if (newPassword !== confirmPassword) {
        res.status(400).json({ 
            success: false, 
            errorCode: "PASSWORDS_DO_NOT_MATCH", 
            message: "Passwords do not match",
        });
    } 

    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(newUsername)) {
        return res.status(400).json({
            success: false,
            errorCode: "INVALID_USERNAME",
            message: "Invalid username format.",
        });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
        return res.status(400).json({
            success: false,
            errorCode: "INVALID_PASSWORD",
            message: "Password does not meet complexity requirements.",
        });
    }

        
    try {
        // better error message when different hings fail?
        if (newPassword == confirmPassword) {
        // what is 10?
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const userId = await saveUser(newUsername, hashedPassword);

            res.json({ success: true, message: "User registered!", userId});
        }
    } catch (err) {
        //console.log(err.message);
        if (err.message.includes("UNIQUE constraint failed: users.username")) {
            res.status(409).json({ 
                success: false, 
                errorCode: "USERNAME_ALREADY_IN_USE",
                message: "Username in use",
            }); 
        } else {
            res.status(500).json({ 
                success: false, 
                errorCode: "REGISTRATION_FAILED", 
                message: "unexpected error",
            }); 
        //validate/restrict password info?
        }
    }
});



app.post("/saveScore", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let token = authHeader.split(" ")[1]; // Split "Bearer <token>" and get the token part
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token format" });
    }

    // token gets transmitted with extra quotations for reasons beyond me
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1); // Remove leading and trailing quote
    }

    const { username, score } = req.body;
    if (!username || score === undefined) {
        return res.status(400).json({ error: "User or score undefined" });
    }
    // these try/catch could be cleaned up
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token", error: err.message });
    }

    try {
        const updatedScores = await saveScore(username, score);
        res.json({ success: true, message: "Score saved!", scores: updatedScores }); 
    } catch (err) {
        res.status(401).json({ success: false, message: "Unauthorized or invalid request", error: err.message });
    }
});

// gotta double check and relearn the jwt things
app.post("/login", async (req, res) => { 
    let username, password;
    try {
        ({ username, password } = req.body);
    }
    catch (error) {
        console.log("server error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error"});
    }
    const user = await findUserByUsername(username); 

    if (!user) {
        return res.status(400).json({ success: false, message: "User not found" }); 
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        const token = jwt.sign({ userId: user.id }, SECRET_KEY, {expiresIn: '1h'});
        res.json({ success : true, message: "Login succesful", user: { username: username, scores: user.scores, token } });
    } else {
        return res.status(400).json({ success: false, message: "Incorrect password" }); 
    }
});

//TODO: understand SQL queries lmao
app.get("/scores", (req, res) => {
    const query = `
        SELECT username, MAX(value) AS max_score
        FROM users, json_each(users.scores)
        GROUP BY username
        ORDER BY max_score DESC
        LIMIT 10;
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


