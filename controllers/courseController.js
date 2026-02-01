// Course Controller for AcademyOS
// Handles course management and operations

const { validationResult } = require('express-validator');
const prisma = require('../src/config/prisma');

/**
 * Get all courses with filtering and pagination
 */
exports.getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter construction
    const where = { isActive: true };

    if (req.query.status) {
      where.status = req.query.status; // Ensure enum match or string
    }

    if (req.query.level) {
      where.level = req.query.level;
    }

    if (req.query.instructor) {
      where.instructors = {
        some: { id: req.query.instructor }
      };
    }

    if (req.query.isFree !== undefined) {
      where.isFree = req.query.isFree === 'true';
    }

    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    // Get courses
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        include: {
          instructors: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.course.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          current: page,
          total: totalPages,
          count: courses.length,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching courses'
    });
  }
};

/**
 * Get courses created by or assigned to me (Teacher)
 */
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        OR: [
          { createdBy: { id: req.user.id } },
          { instructors: { some: { id: req.user.id } } }
        ]
      },
      include: {
        instructors: { select: { firstName: true, lastName: true, avatar: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: { courses }
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching my courses' });
  }
};

/**
 * Get single course by ID
 */
exports.getCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructors: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true } // Removed bio as it's not in User model yet
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        }
        // Prerequisites removed from include for now as self-relation logic needs verify
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get related classes
    const classes = await prisma.class.findMany({
      where: { courseId: req.params.id, isActive: true },
      include: {
        instructor: {
          select: { firstName: true, lastName: true, email: true, avatar: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const now = new Date();

    res.status(200).json({
      success: true,
      data: {
        course,
        classes,
        stats: {
          totalClasses: classes.length,
          upcomingClasses: classes.filter(c => new Date(c.startTime) > now).length,
          completedClasses: classes.filter(c => new Date(c.endTime) < now).length
        }
      }
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course'
    });
  }
};

/**
 * Create a new course
 */
exports.createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title, description, shortDescription, code,
      credits, level, objectives, durationWeeks,
      isFree, price, currency, maxStudents, instructorIds
    } = req.body;

    // Check course code
    const existing = await prisma.course.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    // Prepare instructor connection
    const instructorConnect = [];
    // Always connect creator if they are a teacher? Or just rely on explicit selection?
    // User requested "instructor side should be able to load all available teachers... so that admin can assign"
    // So admin is creating, assigning others. Creator might be admin.

    if (instructorIds && Array.isArray(instructorIds) && instructorIds.length > 0) {
      instructorIds.forEach(id => instructorConnect.push({ id }));
    } else if (req.user.role === 'teacher') {
      // If teacher creates, auto-assign self if no others specified
      instructorConnect.push({ id: req.user.id });
    }

    // Create course
    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        shortDescription: shortDescription ? shortDescription.trim() : null,
        code: code.toUpperCase(),
        credits: credits || 3,
        level: level || 'beginner', // Enum match
        objectives: objectives || [],
        durationWeeks: durationWeeks || 12,
        isFree: isFree || false,
        price: isFree ? 0 : (price || 0),
        currency: currency || 'GHS',
        maxStudents: maxStudents || 30,
        createdBy: { connect: { id: req.user.id } },
        instructors: { connect: instructorConnect }
      },
      include: {
        instructors: { select: { firstName: true, lastName: true, email: true, avatar: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course'
    });
  }
};

/**
 * Update course
 */
exports.updateCourse = async (req, res) => {
  try {
    // Validate request... (omitted standard validation for brevity, assuming standard check)

    // Check ownership/permissions
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { instructors: { select: { id: true } } }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const isInstructor = course.instructors.some(inst => inst.id === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowedUpdates = [
      'title', 'description', 'shortDescription', 'credits', 'level',
      'objectives', 'durationWeeks', 'isFree', 'price',
      'currency', 'maxStudents', 'status', 'thumbnail'
    ];

    const dataToUpdate = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) dataToUpdate[field] = req.body[field];
    });

    const updatedCourse = await prisma.course.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: {
        instructors: { select: { firstName: true, lastName: true, email: true, avatar: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: { course: updatedCourse }
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: 'Server error updating course' });
  }
};

/**
 * Delete course (soft delete)
 */
exports.deleteCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (course.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.course.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.status(200).json({ success: true, message: 'Course deleted successfully' });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Add Instructor
 */
exports.addInstructor = async (req, res) => {
  try {
    const { instructorId } = req.body;

    // Use implicit M-N relation update
    // First verify permission (creator or admin)
    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (course.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const newInstructor = await prisma.user.findUnique({ where: { id: instructorId } });
    if (!newInstructor || newInstructor.role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid instructor' });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        instructors: {
          connect: { id: instructorId }
        }
      },
      include: { instructors: { select: { firstName: true, lastName: true, email: true, avatar: true } } }
    });

    res.status(200).json({
      success: true,
      message: 'Instructor added',
      data: { course: updatedCourse }
    });

  } catch (error) {
    // Handle P2025 (Record not found) or P2002 (Unique constraint) if applicable
    console.error('Add instructor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get Course Stats
 */
exports.getCourseStats = async (req, res) => {
  try {
    // Simplified for now
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const classStats = await prisma.class.groupBy({
      by: ['isActive'], // Assuming status field isn't in Class model currently, using isActive
      where: { courseId: req.params.id },
      _count: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalEnrollments: course.totalEnrollments,
        classStats // Return raw group data for now
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
