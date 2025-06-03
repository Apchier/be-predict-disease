const prisma = require('../config/database');

// Scan an image and save the result
const scanImageService = async (filePath, userId, prediction) => {
    const scanHistory = await prisma.scanHistory.create({
        data: {
            userId,
            diseaseId: prediction.diseaseId,
            imagePath: filePath,
            result: JSON.stringify(prediction),
            confidence: prediction.confidence
        }
    });
    return scanHistory;
};

// Get scan history for a user
const getScanHistoryService = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const [scanHistory, total] = await Promise.all([
        prisma.scanHistory.findMany({
            where: { userId },
            include: { disease: true },
            skip: parseInt(skip),
            take: parseInt(limit),
            orderBy: { scanDate: 'desc' }
        }),
        prisma.scanHistory.count({ where: { userId } })
    ]);
    return { scanHistory, total };
};

// Get a scan by ID
const getScanByIdService = async (id, userId) => {
    return await prisma.scanHistory.findFirst({
        where: { id, userId },
        include: { disease: true }
    });
};

// Delete a scan
const deleteScanService = async (id) => {
    return await prisma.scanHistory.delete({
        where: { id }
    });
};

module.exports = {
    scanImageService,
    getScanHistoryService,
    getScanByIdService,
    deleteScanService
};
