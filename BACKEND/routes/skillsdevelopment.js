import express from "express";
import db from "../db/conn.mjs"
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";
const router = express.Router();

var store = new ExpressBrute.MemoryStore();
var bruteforce = new ExpressBrute(store);

router.get("/",bruteforce.prevent, async (req,res) =>{
    const database = await db();
    let collection = database.collection("skillsdevelopment");
    let results = await collection.find({}).toArray();
    res.status(200).json(results);
});


//creating a cohort
router.post("/resources",bruteforce.prevent, async(req,res) =>{
    let newDocument ={
    id: req.body.id,
    title: req.body.title,
    description:req.body.description,
    cohort:req.body.cohort,
    startdate:req.body.startdate,
    duedate: req.body.duedate,
    status:req.body.status,
    assignedStudents:req.body.assignedStudents
   
      
    };

    const database = await db();
    let collection = database.collection("skillsdevelopment");
    let result = await collection.insertOne(newDocument);
    res.status(201).json(result);
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
    let collection = database.collection("skillsdevelopment");
    let result = await collection.updateOne(query, updates); 
    res.status(200).json(result);
  });



  router.delete("/:id",bruteforce.prevent, async(req,res) =>{
        const query = { _id: new ObjectId(req.params.id) };

        const database = await db();
        const collection = database.collection("skillsdevelopment");
        let result = await collection.deleteOne(query);

        res.status(200).json(result);
    });

export default router;