const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, `./env/${envFile}`);
dotenv.config({ path: envPath });

async function checkDB() {
  try {
    console.log("Connecting to:", process.env.DB_URL);
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected!");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\nCollections and counts:");
    for (let col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
