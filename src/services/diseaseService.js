const prisma = require('../config/database');

// Get all diseases from the database
const getAllDiseasesService = async () => {
    return await prisma.disease.findMany({
        include: {
            cornReferenceImages: true,
            _count: { select: { scanHistory: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

// Get a disease by ID
const getDiseaseByIdService = async (id) => {
    return await prisma.disease.findUnique({
        where: { id },
        include: {
            cornReferenceImages: true,
            _count: { select: { scanHistory: true } }
        }
    });
};

// Create a new disease
const createDiseaseService = async (diseaseData) => {
    return await prisma.disease.create({
        data: {
            ...diseaseData,
            updatedAt: new Date()
        }
    });
};

// Update an existing disease
const updateDiseaseService = async (id, updateData) => {
    return await prisma.disease.update({
        where: { id },
        data: { ...updateData, updatedAt: new Date() }
    });
};

// Delete a disease
const deleteDiseaseService = async (id) => {
    return await prisma.disease.delete({
        where: { id }
    });
};

module.exports = {
    getAllDiseasesService,
    getDiseaseByIdService,
    createDiseaseService,
    updateDiseaseService,
    deleteDiseaseService
};
