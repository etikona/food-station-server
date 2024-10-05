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
    origin: "http://localhost:5173",
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
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  // next();
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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    const userCollection = client.db("foodStation").collection("users");
    const foodCollection = client.db("foodStation").collection("food");
    const requestCollection = client.db("foodStation").collection("request");

    app.post("/jwt", async (req, res) => {
      const logged = req.body;
      console.log("user for token", logged);
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

    // app.post("/logout", async (req, res) => {
    //   const logged = req.body;
    //   console.log("logging out", logged);
    //   res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    // });

    //user related api
    app.get("/api/users", async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    app.post("/api/users", async (req, res) => {
      const user = req.body;

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Food related API
    app.get("/api/food", async (req, res) => {
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

    app.post("/api/food", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });
    app.get("/api/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await foodCollection.findOne(query);
      // console.log(food);
      res.send(food);
    });
    // ! PATCH In FOOD
    app.patch("/api/food/:id", async (req, res) => {
      try {
        const foodId = req.params.id;
        const updatedData = req.body;

        // Log incoming request data
        console.log("Incoming update request data:", updatedData);

        // Validate required fields
        if (!updatedData.food_name || !updatedData.food_quantity) {
          return res.status(400).json({ message: "Required fields missing" });
        }

        // Update food data using MongoDB's native method
        const result = await foodCollection.updateOne(
          { _id: new ObjectId(foodId) }, // Filter by the food's ID
          { $set: updatedData } // Use $set to update the fields
        );

        // Check if the food was found and updated
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Food not found" });
        }

        res.status(200).json({ message: "Food updated successfully!" });
      } catch (error) {
        console.error("Error updating food:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // app.put("/food?:id", async (req, res) => {

    // })
    app.delete("/api/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await foodCollection.deleteOne(query);

      res.send(food);
    });

    // app.get("/request", async (req, res) => {
    //   const userEmail = req.query.email;

    //   try {
    //     let query = {};
    //     if (userEmail) {
    //       query = { email: userEmail };
    //     }

    //     const request = await requestCollection.find(query).toArray();

    //     res.send(request);
    //   } catch (error) {
    //     console.error("Error fetching food data:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });
    app.get("/api/request", async (req, res) => {
      const query = {};
      const request = await requestCollection.find(query).toArray();
      res.send(request);
    });
    // ! Query by email in
    app.get("/request/:email", async (req, res) => {
      const email = req.params.email;
      // Check if email is provided
      if (!email) {
        return res.status(400).send({ error: "Email parameter is missing" });
      }
      try {
        const query = { "donator.email": email }; // Ensure correct email field
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

    // ! Request POST
    app.post("/api/request", async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result);
      // console.log(result);
    });
    app.delete("/api/request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await requestCollection.deleteOne(query);
      res.send(food);
    });
  } catch (err) {
    console.error("Error during MongoDB operations:", err);
  }
}

run().catch(console.dir);

app.get("/api", (req, res) => {
  res.send("food is coming");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
