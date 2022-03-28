const someFun = () => {
  return 5;
}

//Return user object stored in a database that has the given email
function getUserByEmail2 (email, database) {
  for (let key of Object.keys(database)){
    if(database[key].email === email){
      return database[key];
    }
  }
  return null;
}

module.exports = {someFun, getUserByEmail2};