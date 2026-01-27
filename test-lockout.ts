
import { DefendJS } from "./src/index";

async function testLockout() {
    console.log("🔒 Testing Account Lockout (Async Adapter Pattern)...");

    // 1. Initialize DefendJS with lockout enabled
    DefendJS.resetInstance();
    DefendJS.getInstance({
        lockout: {
            enabled: true,
            maxAttempts: 3, // Low threshold for testing
            windowMs: 1000,
            lockDurationMs: 5000 // 5 seconds lock
        }
    });

    const TEST_EMAIL = "attacker@example.com";

    // 2. Simulate 3 failed attempts
    console.log(`\n[1] Simulating 3 failed attempts options: `, { maxAttempts: 3 });

    for (let i = 1; i <= 3; i++) {
        const status = await DefendJS.lockout.increment(TEST_EMAIL);
        console.log(`Attempt ${i}: Locked=${status.isLocked}, RetryAfter=${status.retryAfter}s`);
    }

    // 3. Verify Locked
    const statusLocked = await DefendJS.lockout.check(TEST_EMAIL);
    if (!statusLocked.isLocked) {
        console.error("❌ FAILED: Account should be locked but is NOT.");
        process.exit(1);
    }
    console.log("✅ Verified: Account is currently LOCKED.");

    // 4. Verify lockout duration (partial check)
    if (statusLocked.retryAfter > 0) {
        console.log(`✅ Verified: Retry-After is set to > 0 (${statusLocked.retryAfter}s)`);
    } else {
        console.error("❌ FAILED: Retry-After should be > 0");
    }

    // 5. Simulate Reset (e.g. admin unlock or successful login after timeout)
    console.log("\n[2] Simulating manual reset (successful login)");
    await DefendJS.lockout.reset(TEST_EMAIL);
    const statusReset = await DefendJS.lockout.check(TEST_EMAIL);
    if (statusReset.isLocked) {
        console.error("❌ FAILED: Account should be unlocked after reset.");
        process.exit(1);
    }
    console.log("✅ Verified: Account is UNLOCKED after reset.");

    console.log("\n🎉 Account Lockout Test PASSED!");
}

testLockout();
