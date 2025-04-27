// admin-service/src/controllers/userManagementController.js
const axios = require('axios');
require('dotenv').config();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000/api/auth';

class UserManagementController {
  // Get all users with filtering options
  getAllUsers = async (req, res) => {
    try {
      // Forward query parameters for filtering
      const { role, status, page, limit } = req.query;
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (role) queryParams.append('role', role);
      if (status) queryParams.append('status', status);
      if (page) queryParams.append('page', page);
      if (limit) queryParams.append('limit', limit);
      
      // Make request to auth service
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/users?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': req.headers.authorization // Forward auth token
          }
        }
      );
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching users:', error.message);
      
      // Forward error response from auth service if available
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Get user by ID
  getUserById = async (req, res) => {
    try {
      const { userId } = req.params;
      
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching user:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Approve user (restaurant/driver role)
  approveUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!role || !['restaurant', 'driver'].includes(role)) {
        return res.status(400).json({ message: 'Valid role (restaurant or driver) is required' });
      }
      
      // Update the specific role status to active
      const response = await axios.patch(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        {
          roleStatus: {
            [role]: 'active'
          }
        },
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      return res.status(200).json({
        message: `User ${role} role approved successfully`,
        user: response.data.user
      });
    } catch (error) {
      console.error('Error approving user:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Reject user application (restaurant/driver role)
  rejectUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;
      
      if (!role || !['restaurant', 'driver'].includes(role)) {
        return res.status(400).json({ message: 'Valid role (restaurant or driver) is required' });
      }
      
      // Update the specific role status to inactive
      const response = await axios.patch(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        {
          roleStatus: {
            [role]: 'inactive'
          },
          // Additional data to log rejection reason
          rejectionReason: reason
        },
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      // Implement notification to user about rejection (via email service)
      // This would be a separate call to a notification service
      
      return res.status(200).json({
        message: `User ${role} role application rejected`,
        user: response.data.user
      });
    } catch (error) {
      console.error('Error rejecting user:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Suspend user (all roles or specific role)
  suspendUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;
      
      let updateData = {};
      
      // If role is specified, suspend only that role
      if (role) {
        if (!['customer', 'restaurant', 'driver'].includes(role)) {
          return res.status(400).json({ message: 'Invalid role specified' });
        }
        
        updateData = {
          roleStatus: {
            [role]: 'suspended'
          }
        };
      } else {
        // If no role specified, suspend entire account
        updateData = {
          status: 'suspended'
        };
      }
      
      // Add suspension reason for logging/tracking
      if (reason) {
        updateData.suspensionReason = reason;
      }
      
      const response = await axios.patch(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        updateData,
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      // Implement notification to user about suspension (via email service)
      
      return res.status(200).json({
        message: role 
          ? `User ${role} role suspended` 
          : 'User account suspended',
        user: response.data.user
      });
    } catch (error) {
      console.error('Error suspending user:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Reinstate suspended user (all roles or specific role)
  reinstateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      let updateData = {};
      
      // If role is specified, reinstate only that role
      if (role) {
        if (!['customer', 'restaurant', 'driver'].includes(role)) {
          return res.status(400).json({ message: 'Invalid role specified' });
        }
        
        updateData = {
          roleStatus: {
            [role]: role === 'customer' ? 'active' : 'pending'
          }
        };
      } else {
        // If no role specified, need to check user's roles to set appropriate status
        // First get the current user data
        const userResponse = await axios.get(
          `${AUTH_SERVICE_URL}/users/${userId}`,
          {
            headers: {
              'Authorization': req.headers.authorization
            }
          }
        );
        
        const user = userResponse.data.user;
        
        // Set each role back to appropriate status
        const roleStatusUpdates = {};
        user.roles.forEach(r => {
          roleStatusUpdates[r] = r === 'customer' ? 'active' : 'pending';
        });
        
        updateData = {
          status: user.roles.includes('customer') ? 'active' : 'pending',
          roleStatus: roleStatusUpdates
        };
      }
      
      const response = await axios.patch(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        updateData,
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      // Implement notification to user about reinstatement (via email service)
      
      return res.status(200).json({
        message: role 
          ? `User ${role} role reinstated` 
          : 'User account reinstated',
        user: response.data.user
      });
    } catch (error) {
      console.error('Error reinstating user:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Ban user (permanent)
banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // First get the current user data to access their roles
    const userResponse = await axios.get(
      `${AUTH_SERVICE_URL}/users/${userId}`,
      {
        headers: {
          'Authorization': req.headers.authorization
        }
      }
    );
    
    const user = userResponse.data.user;
    
    // Create roleStatus updates with banned status for all roles
    const roleStatusUpdates = {};
    user.roles.forEach(role => {
      roleStatusUpdates[role] = 'banned';
    });
    
    const updateData = {
      status: 'banned',
      roleStatus: roleStatusUpdates,
      bannedAt: new Date().toISOString()
    };
    
    // Add ban reason for logging/tracking
    if (reason) {
      updateData.banReason = reason;
    }
    
    const response = await axios.patch(
      `${AUTH_SERVICE_URL}/users/${userId}`,
      updateData,
      {
        headers: {
          'Authorization': req.headers.authorization
        }
      }
    );
    
    // Implement notification to user about ban (via email service)
    
    return res.status(200).json({
      message: 'User account permanently banned',
      user: response.data.user
    });
  } catch (error) {
    console.error('Error banning user:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ message: 'Error communicating with auth service' });
  }
};
  
  // Get pending applications for restaurant and driver roles
  getPendingApplications = async (req, res) => {
    try {
      // Get users with pending status for restaurant or driver roles
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/users?status=pending`,
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching pending applications:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
  
  // Get statistics on user registrations and status
  getUserStatistics = async (req, res) => {
    try {
      // This would require custom endpoint on auth service
      // For now we'll just get all users and calculate stats here
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/users?limit=1000`, // Use a high limit to get most/all users
        {
          headers: {
            'Authorization': req.headers.authorization
          }
        }
      );
      
      const users = response.data.users;
      
      // Calculate statistics
      const stats = {
        totalUsers: users.length,
        byStatus: {
          active: users.filter(u => u.status === 'active').length,
          pending: users.filter(u => u.status === 'pending').length,
          inactive: users.filter(u => u.status === 'inactive').length,
          suspended: users.filter(u => u.status === 'suspended').length,
          banned: users.filter(u => u.status === 'banned').length
        },
        byRole: {
          customer: users.filter(u => u.roles.includes('customer')).length,
          restaurant: users.filter(u => u.roles.includes('restaurant')).length,
          driver: users.filter(u => u.roles.includes('driver')).length
        },
        pendingApprovals: {
          restaurant: users.filter(u => 
            u.roles.includes('restaurant') && 
            u.roleStatus.get('restaurant') === 'pending'
          ).length,
          driver: users.filter(u => 
            u.roles.includes('driver') && 
            u.roleStatus.get('driver') === 'pending'
          ).length
        }
      };
      
      return res.status(200).json({ statistics: stats });
    } catch (error) {
      console.error('Error fetching user statistics:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ message: 'Error communicating with auth service' });
    }
  };
}

module.exports = UserManagementController;