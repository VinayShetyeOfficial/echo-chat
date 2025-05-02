const fetch = require("node-fetch")

async function testAuth() {
  try {
    console.log("Testing server connectivity...")

    // Test basic connectivity
    const pingRes = await fetch("http://localhost:3001/ping")
    console.log("Ping response:", await pingRes.text())

    // Test signup
    const signupRes = await fetch("http://localhost:3001/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      }),
    })

    const signupData = await signupRes.json()
    console.log("Signup response:", signupData)
  } catch (error) {
    console.error("Test failed:", error)
  }
}

testAuth()
