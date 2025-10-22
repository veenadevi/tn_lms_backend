import express from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";

const router = express.Router();

/* User Registration */
router.post("/register", async (req, res) => {
  try {
    // Normalize input: accept single user object or array of users
    let usersInput
    if (Array.isArray(req.body)) usersInput = req.body
    else if (Array.isArray(req.body.users)) usersInput = req.body.users
    else usersInput = [req.body]

    // Prepare arrays for results
    const inserted = []
    const skipped = []

    // Collect identifiers to check duplicates (email, admissionNo, employeeId)
    
    const admissionNos = usersInput.map(u => u.admissionNo).filter(Boolean)
    
    // Find existing users by any of these identifiers
    const existingQuery = {
      $or: []
    }
    
    if (admissionNos.length) existingQuery.$or.push({ admissionNo: { $in: admissionNos } })
   

    const existing = existingQuery.$or.length ? await User.find(existingQuery).lean() : []

    // Helper to check if a given user matches existing
    const isDuplicate = (u) => {
      return existing.some(e =>  (u.admissionNo && e.admissionNo === u.admissionNo)  )
    }

    // Hash passwords for each non-duplicate user and prepare docs
    const toInsert = []
    for (const u of usersInput) {
      if (isDuplicate(u)) {
        skipped.push({ reason: 'duplicate', admissionNo: u.admissionNo || null })
        continue
      }
     
      const salt = await bcrypt.genSalt(10)
      const hashed = await bcrypt.hash(u.password || "test123", salt)
      const userAdminId ="ST001"

      console.log("u.admissionNo==============",u.admissionNo)
      
      toInsert.push({
        userType: u.userType,
        userFullName: u.userFullName,
        admissionNo:u.admissionNo,  
        studentExamRollNo: u.studentExamRollNo,
        studentClassRollNo: u.studentClassRollNo,
        class: u.class,
        section: u.section,
        employeeId: u.employeeId,
        age: u.age, 
        dob: u.dob,
        gender: u.gender,
        address: u.address,
        mobileNumber: u.mobileNumber,
        email: u.email,
        password: hashed,
        isAdmin: u.isAdmin || false,
      })
    }

    // Insert documents in bulk
    if (toInsert.length > 0) {
      const created = await User.insertMany(toInsert)
      inserted.push(...created)
    }

    return res.status(200).json({ inserted, skipped })
  } catch (err) {
    console.log("not able to create user", err)
    return res.status(500).json({ error: 'Failed to register users', details: err.message })
  }
});

/* User Login */
router.post("/signin", async (req, res) => {
  try {
    console.log(req.body, "req");
    const user = req.body.admissionId
      || await User.findOne({
          admissionNo: req.body.admissionNo,
        })
     ;

    console.log(user, "user");

    !user && res.status(404).json("User not found");

    const validPass = await bcrypt.compare(req.body.password, user.password);
    !validPass && res.status(400).json("Wrong Password");

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
  }
});

export default router;
