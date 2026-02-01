const prisma = require('../config/database');

/**
 * @desc    Get system analytics
 * @route   GET /api/dashboard/analytics
 * @access  Admin only
 */
exports.getSystemAnalytics = async (req, res) => {
    try {
        const { timeframe = 'month' } = req.query; // week, month, year

        // Calculate date range based on timeframe
        const now = new Date();
        let startDate;

        switch (timeframe) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get total counts
        const [totalUsers, totalCourses, totalEnrollments] = await Promise.all([
            prisma.user.count(),
            prisma.course.count(),
            prisma.enrollment.count()
        ]);

        // Get active users (users who logged in within timeframe)
        const activeUsers = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: startDate
                }
            }
        });

        // Get user counts by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: {
                id: true
            }
        });

        const totalStudents = usersByRole.find(r => r.role === 'student')?._count.id || 0;
        const totalTeachers = usersByRole.find(r => r.role === 'teacher')?._count.id || 0;
        const totalParents = usersByRole.find(r => r.role === 'parent')?._count.id || 0;

        // Get course stats by status
        const coursesByStatus = await prisma.course.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        const publishedCourses = coursesByStatus.find(c => c.status === 'published')?._count.id || 0;
        const draftCourses = coursesByStatus.find(c => c.status === 'draft')?._count.id || 0;
        const archivedCourses = coursesByStatus.find(c => c.status === 'archived')?._count.id || 0;

        // Calculate average enrollment per course
        const averageEnrollment = totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0;

        // Get enrollment trends (last 6 months)
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        const enrollmentsByMonth = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "enrolledAt"), 'Mon') as month,
        COUNT(*)::int as count
      FROM "Enrollment"
      WHERE "enrolledAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "enrolledAt")
      ORDER BY DATE_TRUNC('month', "enrolledAt") ASC
    `;

        // Get top courses by enrollment count
        const topCourses = await prisma.course.findMany({
            take: 5,
            orderBy: {
                enrollments: {
                    _count: 'desc'
                }
            },
            select: {
                id: true,
                title: true,
                _count: {
                    select: {
                        enrollments: true
                    }
                }
            }
        });

        // Format top courses data
        const formattedTopCourses = topCourses.map(course => ({
            title: course.title,
            enrollments: course._count.enrollments,
            rating: 4.5 // Default rating since we don't have ratings yet
        }));

        // Get recent activity (recent enrollments and courses)
        const recentEnrollments = await prisma.enrollment.count({
            where: {
                enrolledAt: {
                    gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        });

        const recentCourses = await prisma.course.count({
            where: {
                createdAt: {
                    gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
                },
                status: 'published'
            }
        });

        const recentUsers = await prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
                }
            }
        });

        // Calculate growth rate (compare current month to previous month)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [lastMonthEnrollments, currentMonthEnrollments] = await Promise.all([
            prisma.enrollment.count({
                where: {
                    enrolledAt: {
                        gte: lastMonthStart,
                        lte: lastMonthEnd
                    }
                }
            }),
            prisma.enrollment.count({
                where: {
                    enrolledAt: {
                        gte: currentMonthStart
                    }
                }
            })
        ]);

        const growthRate = lastMonthEnrollments > 0
            ? ((currentMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
            : 0;

        // Build response
        const analytics = {
            overview: {
                totalUsers,
                totalCourses,
                totalEnrollments,
                activeUsers,
                growthRate: parseFloat(growthRate.toFixed(1)),
                totalStudents,
                totalTeachers,
                totalParents
            },
            courseStats: {
                published: publishedCourses,
                draft: draftCourses,
                archived: archivedCourses,
                averageEnrollment
            },
            enrollmentTrends: enrollmentsByMonth,
            topCourses: formattedTopCourses,
            recentActivity: [
                {
                    type: 'enrollment',
                    description: `${recentEnrollments} new enrollment${recentEnrollments !== 1 ? 's' : ''} today`,
                    time: '24 hours'
                },
                {
                    type: 'course',
                    description: `${recentCourses} new course${recentCourses !== 1 ? 's' : ''} published today`,
                    time: '24 hours'
                },
                {
                    type: 'user',
                    description: `${recentUsers} new user registration${recentUsers !== 1 ? 's' : ''} today`,
                    time: '24 hours'
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Error fetching system analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system analytics',
            error: error.message
        });
    }
};
