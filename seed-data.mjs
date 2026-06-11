import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("password123", 10);
const crashHash = await bcrypt.hash("crash123", 10);

console.log("PASSWORD_HASH:", hash);
console.log("CRASH_HASH:", crashHash);
