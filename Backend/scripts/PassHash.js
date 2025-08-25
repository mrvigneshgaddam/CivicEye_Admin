//for generating new user or admin password hashes
const argon2 = require('argon2');

(async () => {
  const hash = await argon2.hash("test@1234");
  console.log("New Hash:", hash);
})();




