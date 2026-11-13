
const Assignment = require('../models/Assignment');
const mongoose = require('mongoose');
// Create a new assignment
const createAssignment = async (req, res) => {
  try {
    const { title, description, subject, dueDate } = req.body;

    // Check required fields and their types
    const fields = [title, description, subject, dueDate];

    if (
      fields.some(
        value => typeof value !== 'string' || !value.trim()
      )
    ) {
      return res.status(400).json({
        message: 'All fields are required and must be strings'
      });
    }

    // Validate title length
    if (title.trim().length > 150) {
      return res.status(400).json({
        message: 'Title must be 150 characters or fewer'
      });
    }

    // Require an unambiguous ISO date-time with timezone
    const isoDateTime =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

    if (!isoDateTime.test(dueDate)) {
      return res.status(400).json({
        message: 'Use an ISO date-time with a timezone'
      });
    }

    const deadline = new Date(dueDate);

    if (
      Number.isNaN(deadline.getTime()) ||
      deadline.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: 'Due date must be a valid future date'
      });
    }

    // Set creator from authenticated user, not request body
    const assignment = await Assignment.create({
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      dueDate: deadline,
      createdBy: req.user._id,
      status: 'draft'
    });

    return res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });

  } catch (error) {
    console.error('Create assignment error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid assignment data'
      });
    }

    return res.status(500).json({
      message: 'Server error while creating assignment'
    });
  }
};






const getAssignments = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'student') {
      // Students can only see published assignments
      filter = { status: 'published' };

    } else if (req.user.role === 'teacher') {
      // Teachers can see their own assignments
      filter = { createdBy: req.user._id };

    } else if (req.user.role === 'admin') {
      // Admins can see all assignments
      filter = {};

    } else {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const assignments = await Assignment.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: 'Assignments fetched successfully',
      count: assignments.length,
      assignments
    });

  } catch (error) {
    console.error('Get assignments error:', error);

    return res.status(500).json({
      message: 'Server error while fetching assignments'
    });
  }
};




const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check the MongoDB ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid assignment ID'
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found'
      });
    }

    // Teachers can edit only their own assignments
    const isOwner =
      assignment.createdBy.toString() === req.user._id.toString();

    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        message: 'You cannot edit this assignment'
      });
    }

    // Only allow these fields to be updated
    const allowedFields = [
      'title',
      'description',
      'subject',
      'dueDate',
      'status'
    ];

    const updates = Object.keys(req.body);

    if (
      updates.length === 0 ||
      updates.some(field => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: 'Invalid or missing update fields'
      });
    }

    // Validate text fields
    for (const field of ['title', 'description', 'subject']) {
      if (req.body[field] !== undefined) {
        if (
          typeof req.body[field] !== 'string' ||
          !req.body[field].trim()
        ) {
          return res.status(400).json({
            message: `${field} must be a non-empty string`
          });
        }

        assignment[field] = req.body[field].trim();
      }
    }

    // Validate title length
    if (assignment.title.length > 150) {
      return res.status(400).json({
        message: 'Title must be 150 characters or fewer'
      });
    }

    // Validate the deadline when provided
    if (req.body.dueDate !== undefined) {
      if (
        typeof req.body.dueDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(req.body.dueDate)
      ) {
        return res.status(400).json({
          message: 'Use an ISO date-time with a timezone'
        });
      }

      const deadline = new Date(req.body.dueDate);

      if (
        Number.isNaN(deadline.getTime()) ||
        deadline.getTime() <= Date.now()
      ) {
        return res.status(400).json({
          message: 'Due date must be a valid future date'
        });
      }

      assignment.dueDate = deadline;
    }

    // Validate publication status
    if (req.body.status !== undefined) {
      if (!['draft', 'published'].includes(req.body.status)) {
        return res.status(400).json({
          message: 'Status must be draft or published'
        });
      }

      assignment.status = req.body.status;
    }

    await assignment.save();

    return res.status(200).json({
      message: 'Assignment updated successfully',
      assignment
    });

  } catch (error) {
    console.error('Update assignment error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid assignment data'
      });
    }

    return res.status(500).json({
      message: 'Server error while updating assignment'
    });
  }
};







const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the assignment ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid assignment ID'
      });
    }

    // Find the assignment in MongoDB
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found'
      });
    }

    // Check whether the user owns the assignment
    const isOwner =
      assignment.createdBy.toString() === req.user._id.toString();

    // Admins can delete any assignment;
    // teachers can delete only their own.
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        message: 'You cannot delete this assignment'
      });
    }

    // Delete the document from MongoDB
    await assignment.deleteOne();

    return res.status(200).json({
      message: 'Assignment deleted successfully',
      deletedAssignmentId: id
    });

  } catch (error) {
    console.error('Delete assignment error:', error);

    return res.status(500).json({
      message: 'Server error while deleting assignment'
    });
  }
};








module.exports = {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment
};