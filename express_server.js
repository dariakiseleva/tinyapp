const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')

const app = express();
const PORT = 8080; // default port 8080


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());


//----------DATA

//Users
const users = { 
//   "userRandomID": {
//     id: "userRandomID", 
//     email: "user@example.com", 
//     password: "purple-monkey-dinosaur"
//   },
}



//keep track of URLs and their shortened forms
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


//----------HELPER FUNCTIONS

//return 6 random alphanumeric characters
function generateRandomString() {
  let randomString = '';
  let alphaNumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for ( let i = 0; i < 6; i++ ) {
    //Pick a random index and append the corresponding character
    randomString += alphaNumChars.charAt(Math.floor(Math.random()*alphaNumChars.length));
  }
  return randomString;
}

//Email lookup

const emailExists = (email, listOfUsers) => {
  for (let key of Object.keys(listOfUsers)){
    if (listOfUsers[key].email === email){
      return true;
    }
  }
  return false;
}

//register a new user
const createUser = (userInfo, listOfUsers) => {

  const {email, password} = userInfo;

  if (!email || !password){
    return {error: "Incomplete", data: null};
  }

  if (emailExists(email, listOfUsers)){
    return {error: "Email exists", data: null};
  }

  let id = generateRandomString();

  const newUser = {id, email, password};
  listOfUsers[id] = newUser;

  return {error: null, data: newUser};

}

//See if email and password are a match in list of users. If yes, return id. If not, mark as error
const emailMatchesPassword = (email, password, listOfUsers) => {
  for (let key of Object.keys(listOfUsers)){
    if (listOfUsers[key].email === email && listOfUsers[key].password===password){
      return {error: false, user_id: listOfUsers[key].id};
    }
  }
  return {error: true, user_id: null};
}

//Check if login email and password are fully valid
const authenticateUser = (userInfo, listOfUsers) => {
  const {email, password} = userInfo;

  if (!email || !password){
    return {error: "Incomplete", id: null};
  }

  if (!emailExists(email, listOfUsers)){
    return {error: "Email not found", data: null};
  }

  const {error, user_id} = emailMatchesPassword(email, password, listOfUsers);

  if(error){
    return {error: "Wrong password", data: null};
  }

  return {error: null, id: user_id};
}

//----------ROUTES

//HOMEPAGE - UPDATE THIS?
app.get("/", (req, res) => {
  res.send("Hello!");
});

//Index with all URLS
app.get("/urls", (req, res) => {
  const templateVars = { 
    urls: urlDatabase, 
    user: users[req.cookies["user_id"]]
  };
  res.render('urls_index', templateVars);
});

//Add new URL
app.get("/urls/new", (req, res) => {
  const templateVars = { 
    user: users[req.cookies["user_id"]] 
  };
  res.render('urls_new', templateVars);
});

//Page with one URL
app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { 
    shortURL: req.params.shortURL, 
    longURL: urlDatabase[req.params.shortURL], 
    user: users[req.cookies["user_id"]] 
  };
  res.render('urls_show', templateVars);
});

//Adding a new URL - generating a short string and updating database
app.post("/urls", (req, res) => {
  const newShortURL = generateRandomString();
  urlDatabase[newShortURL] = req.body.longURL;
  res.redirect(`/urls/${newShortURL}`);
});

//Delete a URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

//Change a URL
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const newLongURL = req.body.longURL;
  urlDatabase[shortURL] = newLongURL;
  res.redirect("/urls");
});

//Redirect from shortURL to longURL 
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

//Logout
app.post("/logout", (req, res) => {
  res.clearCookie('user_id', {})
  res.redirect("/urls");
});

//Display registration page
app.get("/register", (req, res) => {
  const templateVars = {
    user: users[req.cookies["user_id"]]
  };
  res.render("register", templateVars);
});

//Process a registration
app.post("/register", (req, res) => {
  const {error, data} = createUser(req.body, users);

  if (error==="Email exists") {
    res.status(400);
    return res.send("<b>ERROR 400.</b><br>That email already exists!");
  }

  if (error==="Incomplete") {
    res.status(400);
    return res.send("<b>ERROR 400.</b><br>Please enter ALL info!");
  }
  
  res.cookie("user_id", data.id);
  return res.redirect("/urls");
});

//Display login page
app.get("/login", (req, res) => {
  const templateVars = {
    user: users[req.cookies["user_id"]]
  };
  res.render("login", templateVars);
});

//Process a login
app.post("/login", (req, res) => {
  const {error, id} = authenticateUser(req.body, users);

  if (error==="Incomplete") {
    res.status(400);
    return res.send("<b>ERROR 400.</b><br>Please enter ALL info!");
  }

  if (error==="Email not found") {
    res.status(403);
    return res.send("<b>ERROR 400.</b><br>Email not found.");
  }

  if (error==="Wrong password") {
    res.status(403);
    return res.send("<b>ERROR 400.</b><br>Wrong password.");
  }

  res.cookie("user_id", id);
  return res.redirect("/urls");
});


//---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
