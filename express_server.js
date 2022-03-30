const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');


//----------Set up the APP
const app = express();
const PORT = 8080; // default port 8080
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));


//----------HELPER FUNCTIONS AND DATA 

const {urlsForUser, generateRandomString, createUser, authenticateUser, getTimestamp} = require("./helpers");
const {users, urlDatabase} = require("./data");


//----------ROUTES


//Homepage
app.get("/", (req, res) => {
  //Redirect depending on sign-in status
  if (users[req.session.user_id]){
    return res.redirect("/urls");
  }
  return res.redirect("/login");
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
    totalVisits: urlDatabase[shortURL].totalVisits,
    uniqueVisitors: urlDatabase[shortURL].uniqueVisitors,
    user: users[req.session.user_id],
    visitDetails: urlDatabase[shortURL].visitDetails
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
    userID: req.session.user_id,
    totalVisits: 0, 
    uniqueVisitors: 0,
    visitorCookies: [],
    visitDetails: []
  }

  //Redirect to show one URL
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

  //Change the longURL in the database
  urlDatabase[shortURL].longURL = newLongURL;

  //Reset analytics variables
  urlDatabase[shortURL].totalVisits = 0;
  urlDatabase[shortURL].uniqueVisitors = 0;
  urlDatabase[shortURL].visitorCookies = [];
  urlDatabase[shortURL].visitDetails = [];

  return res.redirect("/urls");
});

//Redirect from shortURL to longURL 
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL].longURL;

  //Increase total visits
  urlDatabase[shortURL].totalVisits++;

  //If a new unique visitor, increment count and store cookie
  if (!urlDatabase[shortURL].visitorCookies.includes(req.session.user_id)){
    urlDatabase[shortURL].visitorCookies.push(req.session.user_id);
    urlDatabase[shortURL].uniqueVisitors++;
  }

  //Record Visit Details
  urlDatabase[shortURL].visitDetails.push({timestamp: getTimestamp(), userID: req.session.user_id});

  // Redirect to long URL
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

  //Set cookie
  req.session.user_id = id;
  return res.redirect("/urls");
});


//---------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
