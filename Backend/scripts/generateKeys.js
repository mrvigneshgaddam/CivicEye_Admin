const crypto = require("crypto");
const fs = require("fs");

// Generate RSA key pair (2048-bit)
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048, // key size in bits
  publicKeyEncoding: {
    type: "spki", // Recommended format
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8", // Recommended format
    format: "pem",
    cipher: "aes-256-cbc", // Optional encryption
    passphrase: "" // Set a password here if you want to protect the key
  }
});

// Save keys to files
fs.writeFileSync("private.pem", privateKey);
fs.writeFileSync("public.pem", publicKey);

console.log("✅ RSA Keys generated!");
console.log("Private Key:\n", privateKey);
console.log("Public Key:\n", publicKey);
