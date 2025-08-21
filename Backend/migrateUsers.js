// const crypto = require('crypto');
// const { generateKeyPairSync } = crypto;

// // Generate RSA key pair
// const { publicKey, privateKey } = generateKeyPairSync('rsa', {
//   modulusLength: 2048, // Key size
//   publicKeyEncoding: {
//     type: 'spki',
//     format: 'pem'
//   },
//   privateKeyEncoding: {
//     type: 'pkcs8',
//     format: 'pem'
//   }
// });

// console.log('=== PUBLIC KEY ===');
// console.log(publicKey);
// console.log('\n=== PRIVATE KEY ===');
// console.log(privateKey);
const bcrypt = require("bcryptjs");

const enteredPassword = "user123"; // what you type when logging in
const storedHash = "$2b$12$MlSDgnrK1ywpxAMed2GCQ.HiG1R215PJiAXZp7kgx20oc0sogCmyC"; // from DB

bcrypt.compare(enteredPassword, storedHash).then(match => {
  console.log("Password match:", match);
});

