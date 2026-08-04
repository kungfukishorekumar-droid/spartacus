/* LOCAL DEV ONLY — run the backend without MongoDB Atlas.
   Spins up a throwaway in-memory MongoDB so you can test everything on your machine.
   Data is NOT saved (resets every restart). For real use, set MONGODB_URI in .env and use `npm run dev`.
   Run:  npm run dev:local */
const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri(); // set before requiring server (dotenv won't override existing env)
  console.log("🧪 In-memory MongoDB started (dev only — data resets on restart).");
  const app = require("./server");
  app.start();
})();
