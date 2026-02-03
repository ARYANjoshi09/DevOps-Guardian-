try {
  const pkg = require("@google/genai");
  console.log("Type of package:", typeof pkg);
  console.log("Keys:", Object.keys(pkg));
  console.log("Exports:", pkg);
} catch (e) {
  console.error("Failed to require:", e);
}
