require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// Use require for importing the validator
const BasicValidator = require("./BasicValidator");

const validator = new BasicValidator();

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Construct MongoDB URI from Environment Variables
const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/`;

// MongoDB variables
let db, collection;

// Initialize MongoDB Connection Once
MongoClient.connect(uri)
  .then((client) => {
    db = client.db(process.env.DATABASE_NAME);
    collection = db.collection(process.env.COLLECTION_NAME);
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
  });

// Start Express Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// xAPI Endpoint
app.post("/xapi/statements", async (req, res) => {
  // Basic Authentication
  const auth = req.headers["authorization"];
  if (
    !auth ||
    auth !== "Basic " + Buffer.from("empress:Empress19").toString("base64")
  ) {
    return res.status(401).send("Unauthorized");
  }

  // Using BasicValidator
  const validationResult = validator.validateStatement(req.body);
  if (!validationResult.valid) {
    return res.status(400).send(validationResult.message);
  }

  // Database and Collection check
  if (!db || !collection) {
    res.status(500).send("Internal Server Error: MongoDB not initialized");
    return;
  }

  try {
    const xAPIStatement = req.body;
    await collection.insertOne(xAPIStatement);
    res.status(200).send("xAPI statement inserted");
  } catch (err) {
    console.error("Error inserting xAPI statement:", err);
    res.status(500).send("Internal Server Error");
  }
});
