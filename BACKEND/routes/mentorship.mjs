import express from "express";
import db from "../db/conn.mjs"
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = express.Router();

router.get("/", async (req,res) =>{
    let collection = await (await db()).collection("mentorship");
    let results = await collection.find({}).toArray();
    res.send(results).status(200);
});


//creating a cohort
router.post("/createassessment", async(req,res) =>{
    let newDocument ={
    assessmentname: req.body.title,
     assessmenttype: req.body.description,
     cohort:req.body.cohort,
     course:req.body.course,
     duedate:req.body.duedate,
     status:req.body.status,
     createdAt: new Date(),
    updatedAt:new Date(),
   
      
    };

    let collection = await (await db()).collection("mentorship");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
}
);

router.patch("/:id", async (req, res) => {
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

    let collection = (await db()).collection("mentorship");
    let result = await collection.updateOne(query, updates); 
res.send(result).status(200);
  });



  router.delete("/:id", async(req,res) =>{
        const query = { _id: new ObjectId(req.params.id) };

        const collection = (await db()).collection("mentorship");
        let result = await collection.deleteOne(query);

        res.send(result).status(200);
    });

export default router;