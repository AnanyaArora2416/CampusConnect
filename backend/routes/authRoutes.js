
// const express = require('express');
// const router = express.Router();
// const { protect } = require('../middleware/authMiddleware');
// const {
//   registerUser,
//   loginUser
// } = require('../controllers/authController');

// // Student registration
// router.post('/register', registerUser);

// // Student login
// router.post('/login', loginUser);



// // Protected route
// router.get('/me', protect, (req, res) => {
//     res.status(200).json({
//       message: 'Protected profile accessed successfully',
//       user: {
//         id: req.user._id,
//         name: req.user.name,
//         email: req.user.email,
//         role: req.user.role
//       }
//     });
//   });






// module.exports = router;
// module.exports = { registerUser, loginUser };

const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected route
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    message: 'Protected profile accessed successfully',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});







// Student-only route
router.get(
    '/student-area',
    protect,
    authorize('student'),
    (req, res) => {
      res.status(200).json({
        message: 'Welcome to the Student Area'
      });
    }
  );
  
  // Teacher-only route
  router.get(
    '/teacher-area',
    protect,
    authorize('teacher'),
    (req, res) => {
      res.status(200).json({
        message: 'Welcome to the Teacher Area'
      });
    }
  );
  
  // Admin-only route
  router.get(
    '/admin-area',
    protect,
    authorize('admin'),
    (req, res) => {
      res.status(200).json({
        message: 'Welcome to the Admin Area'
      });
    }
  );
  
module.exports = router;
