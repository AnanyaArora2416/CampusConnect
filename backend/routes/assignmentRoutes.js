// // Express routes for assignments.
// // Route handlers will be added in a later stage.

// const express = require('express');
// const router = express.Router();

// const { protect } = require('../middleware/authMiddleware');
// const { authorize } = require('../middleware/roleMiddleware');

// const {
//   createAssignment
// } = require('../controllers/assignmentController');

// // Only teachers and admins can create assignments
// router.post(
//   '/',
//   protect,
//   authorize('teacher', 'admin'),
//   createAssignment
// );

// module.exports = router;

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment
} = require('../controllers/assignmentController');
router.post(
  '/',
  protect,
  authorize('teacher', 'admin'),
  createAssignment
);



router.get(
  '/',
  protect,
  authorize('student', 'teacher', 'admin'),
  getAssignments
);



router.put(
  '/:id',
  protect,
  authorize('teacher', 'admin'),
  updateAssignment
);




router.delete(
  '/:id',
  protect,
  authorize('teacher', 'admin'),
  deleteAssignment
);


module.exports = router;
