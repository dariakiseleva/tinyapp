const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');


const app = express();
const PORT = 8080; // default port 8080


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));


//----------DATA

//Users
const users = {
  // "userID1" : {
  //   id: userID1,
  //   email: something@gmail.com,
  //   password: 12345
  // }, 
  // "userID2": ... etc.
}



//keep track of URLs and their shortened forms
const urlDatabase = {
  // "shortURL1": {
  //   longURL: "http://..."
  //   userID: userID1
  // }, 
  // "shortURL2": ... etc
};


//----------HELPER FUNCTIONS

//filter the URLs database so that only URLs of the user are included
const urlsForUser = (id, urlDatabase) => {
  const filteredUrlDatabase = {};
  for (let key of Object.keys(urlDatabase)){
    if (urlDatabase[key].userID === id){
      filteredUrlDatabase[key] = urlDatabase[key];
    }
  }
  return filteredUrlDatabase;
}

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

//register a new user
const createUser = (userInfo, users) => {

  const {email} = userInfo;
  const password = bcrypt.hashSync(userInfo.password, 10);

  if (!email || !password){
    return {error: "Incomplete", data: null};
  }

  if (getUserByEmail(email, users)){
    return {error: "Email exists", data: null};
  }

  let id = generateRandomString();

  const newUser = {id, email, password};
  users[id] = newUser;
  return {error: null, data: newUser};

}

const getUserByEmail = (email, users) => {
  for (let key of Object.keys(users)){
    if(users[key].email === email){
      return users[key];
    }
  }
  return null;
}

//Check if login email and password are fully valid
const authenticateUser = (userInfo, users) => {
  const {email, password} = userInfo;

  if (!email || !password){
    return {error: "Incomplete", id: null};
  }

  const user = getUserByEmail(email, users);

  if (!user){
    return {error: "Email not found", data: null};
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return {error: "Wrong password", data: null};
  }

  return {error: null, id: user.id};
}

//----------ROUTES

//HOMEPAGE - UPDATE THIS?
app.get("/", (req, res) => {
  res.send("Hello!");
});

//Display the My URLs page
app.get("/urls", (req, res) => {

  //Do not display if user is not logged in
  if (!users[req.session.user_id]){
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "You must register or login to create your own URLs."
    };
    return res.status(403).render("error", templateVars);
  }

  const templateVars = { 
    urls: urlsForUser(req.session.user_id, urlDatabase),
    user: users[req.session.user_id]
  };
  return res.render('urls_index', templateVars);
});

//Display page to add a new URL
app.get("/urls/new", (req, res) => {

  //If a user is NOT signed in, redirect them to the login page
  if (!users[req.session.user_id]){
    return res.redirect("/login");
  }

  const templateVars = { 
    user: users[req.session.user_id] 
  };
  return res.render('urls_new', templateVars);
});

//Display page with one URL
app.get("/urls/:shortURL", (req, res) => {

  const shortURL = req.params.shortURL;

  //Ensure that only the owner of the URL can see this page, otherwise display error

  if (!req.session.user_id || (urlDatabase[shortURL]?.userID !== req.session.user_id)){
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Only the owner of this URL can view it."
    };
    return res.status(403).render("error", templateVars);
  }

  const templateVars = { 
    shortURL, 
    longURL: urlDatabase[shortURL].longURL, 
    user: users[req.session.user_id]
  };

  return res.render('urls_show', templateVars);
});

//Add a new URL - generating a short string and updating database
app.post("/urls", (req, res) => {

  //If a user is NOT signed in, return an error
  if (!users[req.session.user_id]){

    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "You must be signed in to add a new URL."
    };
    return res.status(403).render("error", templateVars);

  }

  const newShortURL = generateRandomString();
  urlDatabase[newShortURL] = {
    longURL: req.body.longURL,
    userID: req.session.user_id
  }

  return res.redirect(`/urls/${newShortURL}`);
});

//Delete a URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;

  //Ensure the deletion is being made by the owner of the URL
  if (!req.session.user_id || (urlDatabase[shortURL].userID !== req.session.user_id)){
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Only the owner of this URL can delete it."
    };
    return res.status(403).render("error", templateVars);
  }

  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

//Change a URL
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;

  //Ensure the change is being made by the owner of the URL
  if (!req.session.user_id || (urlDatabase[shortURL].userID !== req.session.user_id)){
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Only the owner of this URL can edit it."
    };
    return res.status(403).render("error", templateVars);
  }

  const newLongURL = req.body.longURL;
  urlDatabase[shortURL] = {
    longURL: newLongURL,
    userID: req.session.user_id
  }
  return res.redirect("/urls");
});

//Redirect from shortURL to longURL 
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

//Logout
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

//Display registration page
app.get("/register", (req, res) => {

  //If a user is signed in, redirect from this page
  if (users[req.session.user_id]){
    return res.redirect("/urls");
  }

  const templateVars = {
    user: users[req.session.user_id]
  };
  return res.render("register", templateVars);
});

//Process a registration
app.post("/register", (req, res) => {
  const {error, data} = createUser(req.body, users);

  //If email exists, display error
  if (error==="Email exists") {
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "This email already exists, try again."
    };
    return res.status(400).render("error", templateVars);
  }

  //If form not fully complete, display error
  if (error==="Incomplete") {
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Incomplete info, try again."
    };
    return res.status(400).render("error", templateVars);
  }
  
  //If no errors, set cookie and redirect to URLs index page
  req.session.user_id = data.id;
  return res.redirect("/urls");
});

//Display login page
app.get("/login", (req, res) => {

  //If a user is signed in, redirect from this page
  if (users[req.session.user_id]){
    return res.redirect("/urls");
  }

  const templateVars = {
    user: users[req.session.user_id]
  };
  return res.render("login", templateVars);
});

//Process a login
app.post("/login", (req, res) => {
  const {error, id} = authenticateUser(req.body, users);

  if (error==="Incomplete") {
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Incomplete info, try again."
    };
    return res.status(400).render("error", templateVars);
  }

  if (error==="Email not found") {
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Email not found."
    };
    return res.status(403).render("error", templateVars);
  }

  if (error==="Wrong password") {
    const templateVars = {
      user: users[req.session.user_id], 
      errorMessage: "Wrong password!"
    };
    return res.status(403).render("error", templateVars);
  }

  req.session.user_id = id;
  return res.redirect("/urls");
});


//---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
