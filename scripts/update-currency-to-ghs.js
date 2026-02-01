const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndUpdateCurrency() {
    try {
        // First, let's see all courses
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                currency: true,
                price: true
            }
        });

        console.log('📋 Current courses:');
        console.log(JSON.stringify(courses, null, 2));

        // Update all courses to GHS
        const result = await prisma.course.updateMany({
            data: {
                currency: 'GHS'
            }
        });

        console.log(`\n✅ Updated ${result.count} courses to GHS currency`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndUpdateCurrency();
