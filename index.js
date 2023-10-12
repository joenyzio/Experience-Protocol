// Load environment variables and required modules
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const cors = require("cors");
const LiveValidator = require("./validators/LiveValidator"); // Assume this is a class

// Initialize Express app and set default port
const app = express();
const port = process.env.APP_PORT || 3000;

// Instantiate the LiveValidator class
const validator = new LiveValidator();

// Apply middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB credentials extracted from environment variables
const mongoCredentials = {
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,
  host: process.env.MONGODB_HOST,
};

// Function to generate MongoDB URI
const generateMongoURI = (dbName) =>
  `mongodb+srv://${mongoCredentials.username}:${mongoCredentials.password}@${mongoCredentials.host}/${dbName}`;

// Declare variables for MongoDB collections
let experiencesCollection, eventsCollection;

// Function to initialize a MongoDB collection
const initializeCollection = async (uri, dbName, collectionName) => {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    return db.collection(collectionName);
  } catch (err) {
    console.error(`Error connecting to ${dbName}`, err);
  }
};

// Immediately Invoked Function Expression (IIFE) to initialize MongoDB collections
(async () => {
  experiencesCollection = await initializeCollection(
    generateMongoURI(process.env.EXPERIENCES_DATABASE_NAME),
    process.env.EXPERIENCES_DATABASE_NAME,
    process.env.EXPERIENCES_COLLECTION_NAME
  );

  eventsCollection = await initializeCollection(
    generateMongoURI(process.env.EVENTS_DATABASE_NAME),
    process.env.EVENTS_DATABASE_NAME,
    process.env.EVENTS_COLLECTION_NAME
  );

  // Start the Express server after database initialization
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
})();

// API Endpoint to handle xAPI statements
app.post("/xapi/statements", async (req, res) => {
  // Validate basic authentication from request headers
  const auth = req.headers["authorization"];
  const validAuth = `Basic ${Buffer.from(
    `${mongoCredentials.username}:${mongoCredentials.password}`
  ).toString("base64")}`;

  if (!auth || auth !== validAuth) {
    return res.status(401).send("Unauthorized");
  }

  // Validate the xAPI statement using the LiveValidator instance
  const validationResult = validator.validateStatement(req.body);

  // Choose the appropriate MongoDB collection based on the validation result
  const targetCollection = validationResult.valid
    ? experiencesCollection
    : eventsCollection;

  // Check if MongoDB collection is initialized
  if (!targetCollection) {
    return res
      .status(500)
      .send("Internal Server Error: Collection not initialized");
  }

  try {
    // Prepare data with a valid timestamp
    const dataToInsert = { ...req.body, timestamp: new Date() };

    // Handle non-xAPI compliant data
    if (!validationResult.valid) {
      dataToInsert.metadata = {
        isValidXAPI: false,
        receivedAt: new Date(),
        validationMessage: validationResult.message,
      };
      res
        .status(400)
        .send("Data inserted in Events collection due to non-compliance");
    } else {
      res
        .status(200)
        .send("xAPI compliant data inserted in Experiences collection");
    }

    // Insert the data into the chosen MongoDB collection
    await targetCollection.insertOne(dataToInsert);
  } catch (err) {
    console.error("Error inserting data:", err);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});
