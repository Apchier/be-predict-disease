const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@cornapp.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@cornapp.com',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    console.log('Created admin user:', admin);

    // Create sample diseases
    const diseases = [
        {
            name: 'healthy',
            title: 'Healthy Corn',
            description: 'Healthy corn leaves with no signs of disease',
            symptoms: 'Green, vibrant leaves with no spots or discoloration',
            treatment: 'No treatment needed. Continue regular care and monitoring.'
        },
        {
            name: 'common_rust',
            title: 'Common Rust',
            description: 'A fungal disease that affects corn leaves',
            symptoms: 'Small, circular to elongate, golden to cinnamon-brown pustules on leaves',
            treatment: 'Apply fungicides containing propiconazole or azoxystrobin. Ensure good air circulation.'
        },
        {
            name: 'northern_leaf_blight',
            title: 'Northern Leaf Blight',
            description: 'A fungal disease causing large lesions on corn leaves',
            symptoms: 'Large, elliptical, gray-green lesions with dark borders on leaves',
            treatment: 'Use resistant varieties, crop rotation, and fungicide applications if severe.'
        },
        {
            name: 'gray_leaf_spot',
            title: 'Gray Leaf Spot',
            description: 'A fungal disease that creates rectangular lesions',
            symptoms: 'Rectangular, gray to tan lesions with parallel sides on leaves',
            treatment: 'Apply fungicides, practice crop rotation, and manage crop residue.'
        }
    ];

    for (const diseaseData of diseases) {
        const disease = await prisma.disease.upsert({
            where: { name: diseaseData.name },
            update: diseaseData,
            create: diseaseData
        });
        console.log('Created disease:', disease.name);
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
