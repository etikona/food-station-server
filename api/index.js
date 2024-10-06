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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hyeg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT verification middleware
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

// Create a router for /app routes
const appRouter = express.Router();

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

    // User related API routes under /app
    appRouter.get("/users", async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });

    appRouter.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Food related API routes under /app
    appRouter.get("/food", async (req, res) => {
      const userEmail = req.query.email;
      try {
        let query = {};
        if (userEmail) {
          query = { email: userEmail };
        }
        const foods = await foodCollection.find(query).toArray();
        res.send(foods);
      } catch (error) {
        console.error("Error fetching food data:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    appRouter.post("/food", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    appRouter.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await foodCollection.findOne(query);
      res.send(food);
    });

    appRouter.patch("/food/:id", async (req, res) => {
      try {
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
      } catch (error) {
        console.error("Error updating food:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    appRouter.delete("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await foodCollection.deleteOne(query);
      res.send(food);
    });

    // Request related API routes
    appRouter.get("/request", async (req, res) => {
      const requests = await requestCollection.find({}).toArray();
      res.send(requests);
    });

    appRouter.get("/request/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.status(400).send({ error: "Email parameter is missing" });
      }
      try {
        const query = { "donator.email": email };
        const result = await requestCollection.find(query).toArray();
        if (result.length === 0) {
          return res
            .status(404)
            .send({ message: "No requests found for this email" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).send({ error: "Failed to fetch requests" });
      }
    });

    appRouter.post("/request", async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result);
    });

    appRouter.delete("/request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const request = await requestCollection.deleteOne(query);
      res.send(request);
    });

    // Apply the /app prefix for all routes in appRouter
    app.use("/app", appRouter);
  } catch (err) {
    console.error("Error during MongoDB operations:", err);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("food is coming");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
