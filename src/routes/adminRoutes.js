// admin-service/src/routes/userManagement.js
const express = require("express");
const router = express.Router();
const UserManagementController = require("../controllers/UserManagementController");

const userManagementController = new UserManagementController();

// Get all users with filtering
router.get("/users", userManagementController.getAllUsers);

// Get single user by ID
router.get("/users/:userId", userManagementController.getUserById);

// Process pending applications
router.post("/users/:userId/approve", userManagementController.approveUser);
router.post("/users/:userId/reject", userManagementController.rejectUser);

// Account status management
router.post("/users/:userId/suspend", userManagementController.suspendUser);
router.post("/users/:userId/reinstate", userManagementController.reinstateUser);
router.post("/users/:userId/ban", userManagementController.banUser);

// Dashboard endpoints
router.get("/pending-applications", userManagementController.getPendingApplications);
router.get("/statistics", userManagementController.getUserStatistics);

module.exports = router;