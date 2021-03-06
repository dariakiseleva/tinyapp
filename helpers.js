const bcrypt = require('bcryptjs');

//----------HELPER FUNCTIONS

//filter the URLs database so that only URLs of the user are included
const urlsForUser = (id, database) => {
  const filteredDatabase = {};
  for (let key of Object.keys(database)){
    if (database[key].userID === id){
      filteredDatabase[key] = database[key];
    }
  }
  return filteredDatabase;
}

//return 6 random alphanumeric characters
const generateRandomString = () => {
  let randomString = '';
  let alphaNumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for ( let i = 0; i < 6; i++ ) {
    //Pick a random index and append the corresponding character
    randomString += alphaNumChars.charAt(Math.floor(Math.random()*alphaNumChars.length));
  }
  return randomString;
}

//register a new user
const createUser = (userInfo, database) => {

  const {email} = userInfo;
  const password = bcrypt.hashSync(userInfo.password, 10);

  if (!email || !password){
    return {error: "Incomplete", data: null};
  }

  if (getUserByEmail(email, database)){
    return {error: "Email exists", data: null};
  }

  let id = generateRandomString();

  const newUser = {id, email, password};
  database[id] = newUser;
  return {error: null, data: newUser};

}

//Return user object stored in a database that has the given email
const getUserByEmail = (email, database) => {
  for (let key of Object.keys(database)){
    if(database[key].email === email){
      return database[key];
    }
  }
  return undefined;
}

//Check if login email and password are fully valid
const authenticateUser = (userInfo, database) => {
  const {email, password} = userInfo;

  if (!email || !password){
    return {error: "Incomplete", id: null};
  }

  const user = getUserByEmail(email, database);

  if (!user){
    return {error: "Email not found", data: null};
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return {error: "Wrong password", data: null};
  }

  return {error: null, id: user.id};
}

//Get current timestamp (as string)
const getTimestamp = () => {
  const date = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

  const year = date.getUTCFullYear();
  const month = monthNames[date.getUTCMonth()];
  const day = ('0' + date.getUTCDate()).slice(-2);
  const hour = ('0' + date.getUTCHours()).slice(-2);
  const min = ('0' + date.getUTCMinutes()).slice(-2);
  const sec = ('0' + date.getUTCSeconds()).slice(-2);

  return {
    day: `${month} ${day}, ${year}`,
    time: `${hour}:${min}:${sec}`
  }
}

module.exports = { urlsForUser, generateRandomString, createUser, getUserByEmail, authenticateUser, getTimestamp};