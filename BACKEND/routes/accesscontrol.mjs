import { logError } from '../utils/logError.mjs';
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateAdmin);

router.use((req,res,next) =>{
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    next();
});

// GET all access control records
router.get("/", async (req, res) => {
  try {
    let collection = await (await db()).collection("accesscontrol");
    let results = await collection.find({}).toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch access control records" });
  }
});

// Create access control record
router.post("/create", async (req, res) => {
  try {
    const { userId, resource, permission, granted } = req.body;

    if (!userId || !resource || !permission) {
      return res.status(400).json({
        message: "userId, resource, and permission are required"
      });
    }

    const collection = await (await db()).collection("accesscontrol");

    const newRecord = {
      userId: userId,
      resource: resource.trim(),
      permission: permission.trim(),
      granted: granted !== undefined ? granted : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newRecord);

    return res.status(201).json({
      success: true,
      message: "Access control record created successfully",
      recordId: result.insertedId,
      record: newRecord
    });

  } catch (error) {
    logError("Create access control error:", error);
    res.status(500).json({
      message: "Internal server error during access control creation"
    });
  }
});

// Update access control record
router.patch("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        resource: req.body.resource,
        permission: req.body.permission,
        granted: req.body.granted,
        updatedAt: new Date()
      },
    };

    let collection = await (await db()).collection("accesscontrol");
    let result = await collection.updateOne(query, updates);
    res.send(result).status(200);
  } catch (error) {
    res.status(500).json({ error: "Failed to update access control record" });
  }
});

// Delete access control record
router.delete("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const collection = await (await db()).collection("accesscontrol");
    let result = await collection.deleteOne(query);
    res.send(result).status(200);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete access control record" });
  }
});

// Check user access to resource
router.get("/check/:userId/:resource/:permission", async (req, res) => {
  try {
    const { userId, resource, permission } = req.params;

    const collection = await (await db()).collection("accesscontrol");
    const record = await collection.findOne({
      userId: userId,
      resource: resource,
      permission: permission
    });

    if (!record) {
      return res.json({
        hasAccess: false,
        message: "No access control record found"
      });
    }

    res.json({
      hasAccess: record.granted,
      record: record
    });

  } catch (error) {
    logError("Check access error:", error);
    res.status(500).json({
      message: "Internal server error during access check"
    });
  }
});

export default router;
