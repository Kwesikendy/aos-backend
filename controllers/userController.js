// User Controller for AcademyOS
// Handles user profile management and user-related operations

const { validationResult } = require('express-validator');
const prisma = require('../config/database');

/**
 * Get all users (Admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    if (req.query.search) {
      where.OR = [
        { firstName: { contains: req.query.search, mode: 'insensitive' } },
        { lastName: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true, role: true,
          phone: true, avatar: true, isActive: true, createdAt: true, lastLogin: true
          // Exclude password
        }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: totalPages,
          count: users.length,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

/**
 * Get user by ID
 */
exports.getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password, ...userData } = user;

    res.status(200).json({
      success: true,
      data: { user: userData }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user' });
  }
};

/**
 * Update user profile
 */
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { firstName, lastName, phone, dateOfBirth, avatar } = req.body;
    const userId = req.params.id;

    // Check auth
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check existence
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = {};
    if (firstName) data.firstName = firstName.trim();
    if (lastName) data.lastName = lastName.trim();
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
    if (avatar) data.avatar = avatar;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    const { password, ...userData } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: userData }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

/**
 * Delete user (Admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Soft delete
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};

/**
 * Change user role (Admin only)
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role against enum manually or trust prisma to throw
    const validRoles = ['student', 'teacher', 'admin', 'parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });

    const { password, ...userData } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: { user: userData }
    });

  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get user stats (Admin)
 */
exports.getUserStats = async (req, res) => {
  try {
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true }
    });

    // To get active counts as well, we might need separate queries or raw query
    // Simplified: just return total counts per role
    // stats = [{ role: 'student', _count: { _all: 5 } }, ...]

    const formattedStats = stats.map(s => ({
      role: s.role,
      total: s._count._all
    }));

    res.status(200).json({
      success: true,
      data: { stats: formattedStats }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get students for the current teacher
 */
exports.getMyStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Find courses taught by teacher
    const courses = await prisma.course.findMany({
      where: {
        instructors: {
          some: { id: teacherId }
        }
      },
      select: { id: true, title: true }
    });

    const courseIds = courses.map(c => c.id);

    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { students: [], count: 0 }
      });
    }

    // 2. Find enrollments in these courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'active'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        course: {
          select: { id: true, title: true }
        }
      }
    });

    // 3. Transform to student-centric list (group courses per student)
    const studentMap = new Map();

    enrollments.forEach(enrollment => {
      const student = enrollment.student;
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          ...student,
          courses: [],
          enrollmentDate: enrollment.enrolledAt
        });
      }
      studentMap.get(student.id).courses.push({
        id: enrollment.course.id,
        title: enrollment.course.title,
        progress: enrollment.progress,
        grade: enrollment.grade
      });
    });

    const students = Array.from(studentMap.values());

    res.status(200).json({
      success: true,
      data: {
        students,
        count: students.length
      }
    });

  } catch (error) {
    console.error('Get My Students Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Link a child to a parent account
 * @route POST /api/users/link-child
 */
exports.linkChild = async (req, res) => {
  try {
    const { studentEmail } = req.body;
    const parentId = req.user.id; // From auth token

    // 1. Find the student by email
    const student = await prisma.user.findUnique({
      where: { email: studentEmail }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student with this email not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ success: false, message: 'The email provided belongs to a user who is not a student' });
    }

    // 2. Check if already linked
    if (student.parentId) {
      if (student.parentId === parentId) {
        return res.status(409).json({ success: false, message: 'Child is already linked to your account' });
      } else {
        return res.status(409).json({ success: false, message: 'Child is already linked to another parent' });
      }
    }

    // 3. Update the student's parentId
    await prisma.user.update({
      where: { id: student.id },
      data: { parentId: parentId }
    });

    res.status(200).json({
      success: true,
      message: 'Child linked successfully',
      data: {
        child: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName
        }
      }
    });

  } catch (error) {
    console.error('Link child error:', error);
    res.status(500).json({ success: false, message: 'Server error linking child' });
  }
};
