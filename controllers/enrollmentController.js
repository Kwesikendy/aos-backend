// Enrollment Controller for AcademyOS
// Handles course enrollment operations

const prisma = require('../config/database');

/**
 * Enroll in a course
 */
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId, instructorId } = req.body;
        const studentId = req.user.id;

        // Check if course exists
        // Include minimal fields needed
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { instructors: { select: { id: true } } }
        });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Validate instructor if provided
        if (instructorId) {
            const isValidInstructor = course.instructors.some(inst => inst.id === instructorId);
            if (!isValidInstructor) {
                return res.status(400).json({ success: false, message: 'Selected instructor is not assigned to this course' });
            }
        } else if (course.instructors.length > 0) {
            // Optional: Auto-assign if only one instructor
            if (course.instructors.length === 1) {
                // We can't easily modify const here, so we'll handle it in data object
            } else {
                // If multiple instructors, maybe require selection?
                // For now, let's allow null if not strict
            }
        }

        // Check if already enrolled
        // Use compound unique constraint logic if implemented, or manual check
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId,
                    courseId
                }
            }
        });

        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Create enrollment transaction to ensure consistency with course counts
        const result = await prisma.$transaction(async (prisma) => {
            const enrollmentData = {
                studentId,
                courseId
            };

            if (instructorId) {
                enrollmentData.instructorId = instructorId;
            } else if (course.instructors.length === 1) {
                enrollmentData.instructorId = course.instructors[0].id;
            }

            const enrollment = await prisma.enrollment.create({
                data: enrollmentData
            });

            // Increment course enrollment count
            await prisma.course.update({
                where: { id: courseId },
                data: {
                    totalEnrollments: { increment: 1 }
                }
            });

            return enrollment;
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error('Enroll error:', error);
        res.status(500).json({ success: false, message: 'Server error enrolling in course' });
    }
};

/**
 * Get my enrollments
 */
exports.getMyEnrollments = async (req, res) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: req.user.id },
            include: {
                course: {
                    select: {
                        title: true,
                        description: true,
                        thumbnail: true,
                        // progress: true, // Progress is on enrollment, not course? Mongoose had it on enrollment. 
                        // Wait, Mongoose populate select included progress? 
                        // Line 43: select: 'title description thumbnail progress instructors'
                        // If progress is on Course model in Mongoose, that's weird. Usually on Enrollment.
                        // Let's check Schema... Enrollment has 'progress'.
                        // Ah, Mongoose populate path 'course' select '...' 
                        // So progress must be on COURSE? No, progress is tracking student progress.
                        // In Mongoose code: `Enrollment.find...populate({ path: 'course', select: '... progress' })`
                        // If Mongoose Schema had progress in Course, it's global progress? Unlikely.
                        // Enrollment model has progress.
                        // The select string in Mongoose applied to the populated doc (Course).
                        // So if 'progress' was in that string, it was trying to fetch course.progress.
                        // My Prisma Enrollment model has `progress`. So I should return that from the root Enrollment object.
                        instructors: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching enrollments' });
    }
};

/**
 * Check enrollment status for a specific course
 */
exports.getEnrollmentStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId,
                    courseId
                }
            },
            select: {
                id: true,
                enrolledAt: true,
                progress: true,
                status: true
            }
        });

        res.status(200).json({
            success: true,
            data: {
                isEnrolled: !!enrollment,
                enrollment: enrollment || null
            }
        });
    } catch (error) {
        console.error('Get enrollment status error:', error);
        res.status(500).json({ success: false, message: 'Server error checking enrollment status' });
    }
};

