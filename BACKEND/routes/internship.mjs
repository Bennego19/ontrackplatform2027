import express from "express";
import db from "../db/conn.mjs"
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = express.Router();

router.get("/", async (req,res) =>{
    let collection = await (await db()).collection("internship");
    let results = await collection.find({}).toArray();
    res.send(results).status(200);
});


//creating a cohort
router.post("/createinternship", async(req,res) =>{
    let newDocument ={
      title: req.body.title,
      company: req.body.company,
      description: req.body.description,
      requirements: req.body.requirements || [],
      eligibility: req.body.eligibility || [],
      location: req.body.location || "",
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      isActive: true,
      createdAt: new Date(),
    };

    let collection = await (await db()).collection("internship");
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

    let collection = (await db()).collection("internship");
    let result = await collection.updateOne(query, updates); 
res.send(result).status(200);
  });



  router.delete("/:id", async(req,res) =>{
        const query = { _id: new ObjectId(req.params.id) };

        const collection = (await db()).collection("internship");
        let result = await collection.deleteOne(query);

        res.send(result).status(200);
    });

export default router;