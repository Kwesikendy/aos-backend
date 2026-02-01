// Assignment Controller for AcademyOS
// Handles assignment creation, submission, and grading

const { validationResult } = require('express-validator');
const prisma = require('../config/database');

/**
 * Get assignments with filtering
 */
exports.getAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    if (req.user.role === 'student') {
      // Find courses the student is enrolled in
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id, status: 'active' },
        select: { courseId: true }
      });
      const courseIds = enrollments.map(e => e.courseId);

      // Filter assignments by these courses
      where.courseId = { in: courseIds };
    }

    if (req.query.course) where.courseId = req.query.course;
    if (req.query.class) where.classId = req.query.class;
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;

    if (req.query.upcoming === 'true') {
      where.status = 'published';
      where.dueDate = { gt: new Date() };
    } else if (req.query.overdue === 'true') {
      where.status = 'published';
      where.dueDate = { lt: new Date() };
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        take: limit,
        skip,
        orderBy: { dueDate: 'asc' },
        include: {
          course: { select: { title: true, code: true } },
          class: { select: { title: true, startTime: true } },
          createdBy: { select: { firstName: true, lastName: true, email: true } }
        }
      }),
      prisma.assignment.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          current: page,
          total: totalPages,
          count: assignments.length,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ success: false, message: 'Server error parsing assignments' });
  }
};

/**
 * Get single assignment
 */
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { title: true, code: true, instructors: true } },
        class: { select: { title: true, startTime: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } }
        // submissions included? maybe strictly for creator/admin
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.status(200).json({
      success: true,
      data: { assignment }
    });

  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Create assignment
 */
exports.createAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const {
      title, description, instructions, course, class: classId, type,
      totalPoints, passingScore, weight, publishDate, dueDate,
      allowLateSubmissions, lateSubmissionPenalty, allowedFileTypes,
      maxFileSize, maxFiles, resources, rubric
    } = req.body;

    // Validate course
    const courseExists = await prisma.course.findUnique({ where: { id: course } });
    if (!courseExists) return res.status(404).json({ success: false, message: 'Course not found' });

    // Validate class
    if (classId) {
      const classExists = await prisma.class.findUnique({ where: { id: classId } });
      if (!classExists) return res.status(404).json({ success: false, message: 'Class not found' });
      if (classExists.courseId !== course) {
        return res.status(400).json({ success: false, message: 'Class mismatch' });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions ? instructions.trim() : null,
        courseId: course,
        classId: classId || null,
        type: type || 'homework',
        totalPoints: totalPoints || 100,
        passingScore: passingScore || 60,
        weight: weight || 0,
        publishDate: publishDate ? new Date(publishDate) : null,
        dueDate: new Date(dueDate),
        allowLateSubmissions: allowLateSubmissions || false,
        lateSubmissionPenalty: lateSubmissionPenalty || 0,
        allowedFileTypes: allowedFileTypes || [],
        maxFileSize: maxFileSize || 10,
        maxFiles: maxFiles || 1,
        resources: resources || [], // Prisma Json handles array
        rubric: rubric || [],       // Prisma Json handles array
        creatorId: req.user.id
      },
      include: {
        course: { select: { title: true, code: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created',
      data: { assignment }
    });

  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update assignment
 */
exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { course: { include: { instructors: true } } }
    });

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Auth check
    const isCreator = assignment.creatorId === req.user.id;
    const isCourseInstructor = assignment.course.instructors.some(i => i.id === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isCourseInstructor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updates = { ...req.body };
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    if (updates.publishDate) updates.publishDate = new Date(updates.publishDate);

    // Remove protected fields
    delete updates.course;
    delete updates.class;
    delete updates.createdBy;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: updates
    });

    res.status(200).json({
      success: true,
      message: 'Assignment updated',
      data: { assignment: updatedAssignment }
    });

  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Delete assignment
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { course: { include: { instructors: true } } }
    });

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Auth check
    const isCreator = assignment.creatorId === req.user.id;
    const isCourseInstructor = assignment.course.instructors.some(i => i.id === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isCourseInstructor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check submissions? (Not implemented in schema yet, skipping logic)

    await prisma.assignment.update({
      where: { id: req.params.id },
      data: { isActive: false, status: 'closed' }
    });

    res.status(200).json({ success: true, message: 'Assignment deleted' });

  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Submit assignment (Placeholder for now)
 */
exports.submitAssignment = async (req, res) => {
  // TODO: Implement Submission model and logic
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

/**
 * Grade assignment (Placeholder for now)
 */
exports.gradeAssignment = async (req, res) => {
  // TODO: Implement Submission model and logic
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

/**
 * Get stats (Placeholder for now)
 */
exports.getAssignmentStats = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

/**
 * Add resource
 */
exports.addResource = async (req, res) => {
  try {
    const { title, description, fileUrl, externalLink } = req.body;
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Use Prisma's JSON handling. We need to fetch, push, update.
    const currentResources = assignment.resources || [];
    // Ensure it's an array (Prisma might return null)
    const resourcesArray = Array.isArray(currentResources) ? currentResources : [];

    resourcesArray.push({
      title, description, fileUrl, externalLink, uploadedBy: req.user.id
    });

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { resources: resourcesArray }
    });

    res.status(200).json({ success: true, data: { assignment: updated } });

  } catch (error) {
    console.error('Add resource error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
