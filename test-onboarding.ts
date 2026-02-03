import fetch from "node-fetch";

async function main() {
  console.log("--- Testing Onboarding API ---");

  // Note: This relies on a REAL GitHub Token.
  // For the test to pass without a real token, the GitHubService would need to be mocked or we expect a failure.
  // We will assume the user (you) might not have put a real GITHUB_TOKEN in env yet for this test script.
  // So we will send a 'mock-token' and expect a 500 error from the API (Validation Failed),
  // which confirms the endpoint is reachable and logic is running.

  const payload = {
    name: "Test Project",
    githubRepo: "test/repo",
    githubToken: "mock-gh-token",
  };

  try {
    const res = await fetch("http://localhost:3001/api/onboarding/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);

    if (res.status === 500 && data.error === "Invalid GitHub Token") {
      console.log("SUCCESS: API correctly rejected invalid token (Validation Logic Works).");
    } else if (res.status === 200) {
      console.log("SUCCESS: Project created!");
    } else {
      console.log("unexpected result.");
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

main();
