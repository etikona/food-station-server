const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://food-station-client.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// Define base path for your routes
const apiRouter = express.Router();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hyeg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB connection...
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const foodCollection = client.db("foodStation").collection("food");
    const requestCollection = client.db("foodStation").collection("request");

    // Food routes
    apiRouter.get("/food", async (req, res) => {
      const userEmail = req.query.email;
      let query = {};
      if (userEmail) {
        query = { email: userEmail };
      }
      const foods = await foodCollection.find(query).toArray();
      res.send(foods);
    });

    apiRouter.post("/food", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    apiRouter.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await foodCollection.findOne(query);
      res.send(food);
    });

    apiRouter.patch("/food/:id", async (req, res) => {
      const foodId = req.params.id;
      const updatedData = req.body;
      const result = await foodCollection.updateOne(
        { _id: new ObjectId(foodId) },
        { $set: updatedData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Food not found" });
      }
      res.status(200).json({ message: "Food updated successfully!" });
    });

    apiRouter.delete("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    // Other routes...

    app.use("/app", apiRouter); // Mount the router on /app
  } catch (err) {
    console.error("Error during MongoDB operations:", err);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("food is coming");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
