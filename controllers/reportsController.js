const prisma = require('../config/database');

/**
 * Get Enrollment Reports
 * - Total enrollments
 * - Enrollments over time (last 6 months)
 * - Top courses by enrollment
 */
exports.getEnrollmentStats = async (req, res) => {
    try {
        // 1. Total active enrollments
        const totalEnrollments = await prisma.enrollment.count({
            where: { status: 'active' }
        });

        // 2. Enrollments per course (Top 5)
        const enrollmentsByCourse = await prisma.enrollment.groupBy({
            by: ['courseId'],
            _count: {
                studentId: true
            },
            orderBy: {
                _count: {
                    studentId: 'desc'
                }
            },
            take: 5
        });

        // Populate course names
        const courseIds = enrollmentsByCourse.map(e => e.courseId);
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true, code: true }
        });

        const courseData = enrollmentsByCourse.map(item => {
            const course = courses.find(c => c.id === item.courseId);
            return {
                name: course ? course.title : 'Unknown Course',
                code: course ? course.code : '???',
                count: item._count.studentId
            };
        });

        // 3. Enrollments Trend (Last 6 months) - simplified grouping by getting all and mapping in JS for flexibility
        // (Prisma groupBy date is tricky across DBs, doing JS aggregation for last 6 months is safe for moderate data)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const recentEnrollments = await prisma.enrollment.findMany({
            where: {
                enrolledAt: { gte: sixMonthsAgo }
            },
            select: { enrolledAt: true }
        });

        // Aggregate by Month
        const trendMap = {};
        recentEnrollments.forEach(e => {
            const month = new Date(e.enrolledAt).toLocaleString('default', { month: 'short' });
            trendMap[month] = (trendMap[month] || 0) + 1;
        });

        const trendData = Object.entries(trendMap).map(([name, value]) => ({ name, value }));

        res.json({
            success: true,
            data: {
                total: totalEnrollments,
                byCourse: courseData,
                trend: trendData
            }
        });

    } catch (error) {
        console.error('Enrollment Report Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Get Attendance Reports
 * - Overall Attendance Rate
 * - Attendance by Status
 * - Daily Attendance Trend
 */
exports.getAttendanceStats = async (req, res) => {
    try {
        const totalRecords = await prisma.attendance.count();
        if (totalRecords === 0) {
            return res.json({ success: true, data: { rate: 0, byStatus: [], trend: [] } });
        }

        // 1. By Status
        const byStatus = await prisma.attendance.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        const statusData = byStatus.map(s => ({
            name: s.status,
            value: s._count.id
        }));

        // Rate Calculation (Present / Total)
        const presentCount = statusData.find(s => s.name === 'present')?.value || 0;
        const rate = Math.round((presentCount / totalRecords) * 100);

        // 2. Daily Trend (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentAttendance = await prisma.attendance.findMany({
            where: { date: { gte: sevenDaysAgo } },
            select: { date: true, status: true }
        });

        // Group by day ratio
        const dailyMap = {};
        recentAttendance.forEach(a => {
            const day = new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (!dailyMap[day]) dailyMap[day] = { present: 0, total: 0 };
            dailyMap[day].total++;
            if (a.status === 'present') dailyMap[day].present++;
        });

        const trendData = Object.entries(dailyMap).map(([name, counts]) => ({
            name,
            rate: Math.round((counts.present / counts.total) * 100)
        }));

        res.json({
            success: true,
            data: {
                rate,
                byStatus: statusData,
                trend: trendData
            }
        });

    } catch (error) {
        console.error('Attendance Report Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Get Performance Reports
 * - Average Course Grades
 */
exports.getPerformanceStats = async (req, res) => {
    try {
        // Enrolled students with grades
        // We want average grade per course
        const grades = await prisma.enrollment.groupBy({
            by: ['courseId'],
            _avg: {
                grade: true
            },
            where: {
                grade: { not: null }
            }
        });

        // Populate course names
        const courseIds = grades.map(g => g.courseId);
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true }
        });

        const performanceData = grades.map(item => {
            const course = courses.find(c => c.id === item.courseId);
            return {
                course: course ? course.title : 'Unknown',
                average: Math.round(item._avg.grade || 0)
            };
        }).sort((a, b) => b.average - a.average);

        res.json({
            success: true,
            data: {
                byCourse: performanceData
            }
        });

    } catch (error) {
        console.error('Performance Report Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
