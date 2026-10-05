import express from "express";
import db from "../db/conn.mjs"
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";
const router = express.Router();

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});


var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);

router.get("/",bruteforce.prevent, async (req,res) =>{
    const database = await db();
    let collection = database.collection("cohort");
    let results = await collection.find({}).toArray();
    res.send(results).status(200);
});


//creating a cohort
router.post("/createcohort",bruteforce.prevent, async(req,res) =>{
    let newDocument ={
       cohortname: req.body.cohortname,
       cohorttrack: req.body.cohorttrack,
       cohortnumber:req.body.cohortnumber,
       programname:req.body.programname,
       startdate:req.body.startdate
    };

    const database = await db();
    let collection = database.collection("cohort");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
}
);

router.patch("/:id",bruteforce.prevent, async (req, res) => {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
       cohortname: req.body.cohortname,
       cohorttrack: req.body.cohorttrack,
       cohortnumber:req.body.cohortnumber,
       programname:req.body.programname,
       startdate:req.body.startdate
      },
    };

    const database = await db();
    let collection = database.collection("cohort");
    let result = await collection.updateOne(query, updates); 
res.send(result).status(200);
  });



  router.delete("/:id", bruteforce.prevent, async(req,res) =>{
        const query = { _id: new ObjectId(req.params.id) };

        const database = await db();
        const collection = database.collection("cohort");
        let result = await collection.deleteOne(query);

        res.send(result).status(200);
    });

// GET total cohorts count - FOR DASHBOARD
router.get("/total", bruteforce.prevent, async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const database = await db();
    let collection = database.collection("cohort");
    const total = await collection.countDocuments({});

    res.status(200).json({
      total: total,
      message: "Total cohorts retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching total cohorts:", error);
    res.status(500).json({
      error: "Failed to fetch total cohorts"
    });
  }
});

export default router;
