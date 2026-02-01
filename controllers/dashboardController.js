const prisma = require('../src/config/prisma');

exports.getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. Get Enrollments with Course details
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: {
                    include: {
                        instructors: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            }
        });

        // 2. Calculate Stats
        const totalCredits = enrollments.reduce((acc, curr) => acc + (curr.course.credits || 0), 0);
        const completedCourses = enrollments.filter(e => e.status === 'completed').length;
        // Calculate average grade
        const validGrades = enrollments.filter(e => e.grade !== null).map(e => e.grade);
        const averageGrade = validGrades.length > 0
            ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
            : 0;

        // 3. Get Upcoming Classes
        const courseIds = enrollments.map(e => e.courseId);
        const upcomingClasses = await prisma.class.findMany({
            where: {
                courseId: { in: courseIds },
                startTime: { gte: new Date() }
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            include: { course: { select: { title: true } } }
        });

        // 4. Assignments (Pending/Upcoming)
        const pendingAssignments = await prisma.assignment.findMany({
            where: {
                courseId: { in: courseIds },
                dueDate: { gte: new Date() },
                isActive: true
            },
            take: 3,
            orderBy: { dueDate: 'asc' },
            select: { id: true, title: true, dueDate: true, course: { select: { title: true } } }
        });

        // 5. Attendance Rate
        // Get total attendance records for this student
        const attendanceRecords = await prisma.attendance.findMany({
            where: { studentId }
        });

        // Calculate presence (Present or Late counts as attended)
        const presentCount = attendanceRecords.filter(a => ['present', 'late'].includes(a.status)).length;
        const totalAttendance = attendanceRecords.length;
        const attendanceRate = totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
            : 100; // Default to 100 if no records yet

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalCourses: enrollments.length,
                    completedCourses,
                    averageGrade: averageGrade.toFixed(1),
                    totalCredits,
                    attendanceRate: attendanceRate,
                    pendingAssignmentsCount: pendingAssignments.length
                },
                enrolledCourses: enrollments,
                upcomingClasses,
                assignments: pendingAssignments
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching dashboard data' });
    }
};

exports.getTeacherDashboard = async (req, res) => {
    try {
        const teacherId = req.user.id;

        // 1. Get Teacher's Courses
        // In Prisma schema: User has implicit M-N with Course via "Instructors" relation
        // We can find courses where this user is in instructors
        const courses = await prisma.course.findMany({
            where: {
                instructors: {
                    some: { id: teacherId }
                }
            }
        });

        const courseIds = courses.map(c => c.id);

        // 2. Total Students
        // Find distinct studentIds in enrollments for these courses
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId: { in: courseIds } },
            select: { studentId: true },
            distinct: ['studentId']
        });
        const totalStudents = enrollments.length;

        // 3. Upcoming Classes
        const upcomingClasses = await prisma.class.count({
            where: {
                instructorId: teacherId,
                startTime: { gte: new Date() }
            }
        });

        // 4. Recent Activity (New Enrollments)
        const recentEnrollments = await prisma.enrollment.findMany({
            where: { courseId: { in: courseIds } },
            orderBy: { enrolledAt: 'desc' },
            take: 5,
            include: {
                student: { select: { firstName: true, lastName: true, avatar: true } },
                course: { select: { title: true } }
            }
        });

        // 5. Pending Grading (Assignments in courses taught by teacher, not yet graded)
        // Since Submission model is missing, we count assignments that are active and past due date?
        // Or just count active assignments for now as potential grading work
        const pendingGrading = await prisma.assignment.count({
            where: {
                courseId: { in: courseIds },
                status: 'published'
            }
        });

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalCourses: courses.length,
                    totalStudents,
                    pendingGrading,
                    upcomingClasses
                },
                recentActivity: recentEnrollments.map(e => ({
                    type: 'enrollment',
                    studentName: `${e.student?.firstName} ${e.student?.lastName}`,
                    courseName: e.course?.title,
                    time: e.enrolledAt
                }))
            }
        });

    } catch (error) {
        console.error('Teacher Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching teacher dashboard' });
    }
};

exports.getAdminDashboard = async (req, res) => {
    try {
        // 1. Get all user counts by role
        const [totalUsers, students, teachers, parents] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'student' } }),
            prisma.user.count({ where: { role: 'teacher' } }),
            prisma.user.count({ where: { role: 'parent' } })
        ]);

        // 2. Get course stats
        const [totalCourses, publishedCourses, draftCourses] = await Promise.all([
            prisma.course.count(),
            prisma.course.count({ where: { status: 'published' } }),
            prisma.course.count({ where: { status: 'draft' } })
        ]);

        // 3. Get total enrollments
        const totalEnrollments = await prisma.enrollment.count();

        // 4. Get recent enrollments for activity feed
        const recentEnrollments = await prisma.enrollment.findMany({
            take: 5,
            orderBy: { enrolledAt: 'desc' },
            include: {
                student: { select: { firstName: true, lastName: true } },
                course: { select: { title: true } }
            }
        });

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalStudents: students,
                    totalTeachers: teachers,
                    totalParents: parents,
                    totalCourses,
                    publishedCourses,
                    draftCourses,
                    totalEnrollments
                },
                recentActivity: recentEnrollments.map(e => ({
                    type: 'enrollment',
                    description: `${e.student.firstName} ${e.student.lastName} enrolled in "${e.course.title}"`,
                    time: e.enrolledAt
                }))
            }
        });

    } catch (error) {
        console.error('Admin Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching admin dashboard' });
    }
};

exports.getParentDashboard = async (req, res) => {
    try {
        const parentId = req.user.id;

        // 1. Get Children
        const children = await prisma.user.findMany({
            where: { parentId: parentId },
            include: {
                enrollments: {
                    include: {
                        course: { select: { title: true } }
                    }
                },
                attendance: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });

        // 2. Aggregate Stats
        let totalCourses = 0;
        let totalAttendance = 0;
        let totalAttendanceCount = 0;
        let totalGrades = 0;
        let gradeCount = 0;

        const childrenData = children.map(child => {
            // Courses
            totalCourses += child.enrollments.length;

            // Attendance
            // For simplicity, we'd need more attendance data to calculate child's rate
            // Assuming child.attendance is just recent.
            // Let's fetch basic stats per child?
            // For now, construct simplified child object

            const courses = child.enrollments.map(e => ({
                id: e.courseId,
                name: e.course.title,
                progress: e.progress,
                grade: e.grade ? `${e.grade.toFixed(1)}/100` : 'N/A' // Convert to representation
            }));

            // Grades aggregation
            child.enrollments.forEach(e => {
                if (e.grade) {
                    totalGrades += e.grade;
                    gradeCount++;
                }
            });

            return {
                id: child.id,
                name: `${child.firstName} ${child.lastName}`,
                grade: 'N/A', // Grade level not in User model yet
                avatar: child.avatar,
                attendance: 100, // Placeholder or need aggregate fetch
                courses,
                nextClass: { subject: 'Unknown', time: 'TBD', date: new Date() } // Needs Class fetch
            };
        });

        const stats = {
            totalChildren: children.length,
            totalCourses,
            averageGrade: gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) : 0,
            attendanceRate: 0 // Placeholder
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                children: childrenData,
                recentActivity: [] // Placeholder
            }
        });

    } catch (error) {
        console.error('Parent Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching parent dashboard' });
    }
};

exports.getChildDetail = async (req, res) => {
    try {
        const parentId = req.user.id;
        const studentId = req.params.id;

        // 1. Verify Parent-Child Relationship
        const student = await prisma.user.findFirst({
            where: {
                id: studentId,
                parentId: parentId
            }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Child not found or not authorized' });
        }

        // 2. Reuse Student Dashboard Logic (or similar)
        // Fetches enrollments, stats, etc. specific to this studentId

        const enrollments = await prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: {
                    include: { instructors: { select: { firstName: true, lastName: true } } }
                }
            }
        });

        // Stats Calculation
        const totalCredits = enrollments.reduce((acc, curr) => acc + (curr.course.credits || 0), 0);
        const completedCourses = enrollments.filter(e => e.status === 'completed').length;
        const validGrades = enrollments.filter(e => e.grade !== null).map(e => e.grade);
        const averageGrade = validGrades.length > 0
            ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
            : 0;

        // Upcoming Classes
        const courseIds = enrollments.map(e => e.courseId);
        const upcomingClasses = await prisma.class.findMany({
            where: {
                courseId: { in: courseIds },
                startTime: { gte: new Date() }
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            include: { course: { select: { title: true } } }
        });

        // Pending Assignments
        const pendingAssignments = await prisma.assignment.findMany({
            where: {
                courseId: { in: courseIds },
                dueDate: { gte: new Date() },
                isActive: true
            },
            take: 3,
            orderBy: { dueDate: 'asc' },
            select: { id: true, title: true, dueDate: true, course: { select: { title: true } } }
        });

        // Attendance Stats
        const attendanceRecords = await prisma.attendance.findMany({ where: { studentId } });
        const presentCount = attendanceRecords.filter(a => ['present', 'late'].includes(a.status)).length;
        const totalAttendance = attendanceRecords.length;
        const attendanceRate = totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
            : 100;

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    avatar: student.avatar,
                    email: student.email
                },
                stats: {
                    totalCourses: enrollments.length,
                    completedCourses,
                    averageGrade: averageGrade.toFixed(1),
                    totalCredits,
                    attendanceRate,
                    pendingAssignmentsCount: pendingAssignments.length
                },
                enrolledCourses: enrollments,
                upcomingClasses,
                assignments: pendingAssignments
            }
        });

    } catch (error) {
        console.error('Child Detail Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching child details' });
    }
};
