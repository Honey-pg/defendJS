import { DefendJS } from "./src/core/DefendJS";
import bcrypt from "bcryptjs";
import argon2 from "argon2";

async function run() {
    // Initialize DefendJS with argon2 as primary
    DefendJS.getInstance({
        hashing: {
            primary: "argon2",
            fallback: "bcrypt",
            saltRounds: 10
        }
    });

    console.log("Testing needsRehash...");

    // 1. Test generic bcrypt hash (needs upgrade)
    const testPassword = "mySecretPassword123!";
    const oldBcryptHash = await bcrypt.hash(testPassword, 8); // Using 8 to force parameter mismatch even if both were bcrypt
    console.log("Old bcrypt hash:", oldBcryptHash);

    const needsUpgrade1 = await DefendJS.hash.needsRehash(oldBcryptHash);
    console.log("needsRehash for bcrypt hash? (Expecting true):", needsUpgrade1);

    // 2. Test argon2 hash (does not need upgrade)
    const newArgonHash = await DefendJS.hash(testPassword);
    console.log("New argon2 hash:", newArgonHash);

    const needsUpgrade2 = await DefendJS.hash.needsRehash(newArgonHash);
    console.log("needsRehash for argon hash? (Expecting false):", needsUpgrade2);

    if (needsUpgrade1 === true && needsUpgrade2 === false) {
        console.log("SUCCESS: needsRehash works correctly.");
        process.exit(0);
    } else {
        console.error("FAILED: needsRehash returned unexpected results.");
        process.exit(1);
    }
}

run().catch(console.error);
