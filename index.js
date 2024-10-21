const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hyeg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("foodStation").collection("users");
    const foodCollection = client.db("foodStation").collection("food");
    const requestCollection = client.db("foodStation").collection("request");

    app.post("/jwt", async (req, res) => {
      const logged = req.body;
      const token = jwt.sign(logged, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    // Testing Route
    app.get("/api/test", (req, res) => {
      res.send("Testing route works properly");
    });
    // User-related API
    app.get("/api/users", async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });

    app.post("/api/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Food-related API
    app.get("/api/food", async (req, res) => {
      const userEmail = req.query.email;
      let query = {};
      if (userEmail) {
        query = { email: userEmail };
      }
      const foods = await foodCollection.find(query).toArray();
      res.send(foods);
    });

    app.post("/api/food", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    app.get("/api/food/:id", async (req, res) => {
      const id = req.params.id;
      const food = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(food);
    });

    app.patch("/api/food/:id", async (req, res) => {
      const foodId = req.params.id;
      const updatedData = req.body;

      if (!updatedData.food_name || !updatedData.food_quantity) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const result = await foodCollection.updateOne(
        { _id: new ObjectId(foodId) },
        { $set: updatedData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Food not found" });
      }

      res.status(200).json({ message: "Food updated successfully!" });
    });

    app.delete("/api/food/:id", async (req, res) => {
      const id = req.params.id;
      const food = await foodCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(food);
    });

    // Request-related API
    app.get("/api/request", async (req, res) => {
      const request = await requestCollection.find({}).toArray();
      res.send(request);
    });

    app.get("/api/request/:email", async (req, res) => {
      const email = req.params.email;
      const result = await requestCollection
        .find({ "donator.email": email })
        .toArray();
      if (result.length === 0) {
        return res
          .status(404)
          .send({ message: "No requests found for this email" });
      }
      res.send(result);
    });

    app.post("/api/request", async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result);
    });

    app.delete("/api/request/:id", async (req, res) => {
      const id = req.params.id;
      const food = await requestCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(food);
    });
  } catch (err) {
    console.error("Error during MongoDB operations:", err);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Food station API is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app; // Export the app for Vercel
