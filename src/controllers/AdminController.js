// auth-service/src/controllers/adminController.js
const { Admin } = require("../models/admin");
const bcrypt = require("bcrypt");
const Joi = require("joi");

// Create a new admin
const createAdmin = async (req, res) => {
  try {
    // Validate request body
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        status: "error", 
        message: error.details[0].message 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: req.body.email });
    if (existingAdmin) {
      return res.status(409).json({ 
        status: "error", 
        message: "Admin with this email already exists" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create new admin
    const admin = new Admin({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    });

    // Save admin to database
    await admin.save();

    // Return success response without password
    const { password, ...adminData } = admin.toObject();
    return res.status(201).json({
      status: "success",
      message: "Admin created successfully",
      data: adminData
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

// Admin login
const loginAdmin = async (req, res) => {
  try {
    // Validate request body
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        status: "error", 
        message: error.details[0].message 
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(req.body.password, admin.password);
    if (!validPassword) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    // Generate auth token
    const token = admin.generateAuthToken();

    // Return success response with token
    return res.status(200).json({
      status: "success",
      message: "Admin logged in successfully",
      token: token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("Error logging in admin:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

module.exports = {
  createAdmin,
  loginAdmin
};