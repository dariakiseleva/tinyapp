const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 8080; // default port 8080


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

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

//----------ROUTES

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get("/urls/new", (req, res) => {
  res.render('urls_new');
});


app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]};
  res.render('urls_show', templateVars);
});

//Matches the POST request of the form
app.post("/urls", (req, res) => {
  console.log(req.body);  // Log the POST request body to the console, e.g. { longURL: 'DariaK' }
  //body-parser library parses this into a JS object!

  //Update the database with randomly generated shortURL and submitted longURL
  const newShortURL = generateRandomString();
  urlDatabase[newShortURL] = req.body.longURL;

  //respond with a redirect --> This will make a GET request defined above
  res.redirect(`/urls/${newShortURL}`);

});

//Redirect from shortURL to longURL
//e.g. http://localhost:8080/u/b2xVn2 will go to http://www.lighthouselabs.ca 
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
