const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { predictDisease } = require('../services/mlService');
const fs = require('fs').promises;
const path = require('path');

const scanImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return sendError(res, 'Image file is required', 400);
        }

        // Simulate ML prediction (replace with actual ML service)
        const prediction = await predictDisease(req.file.path);

        const result = {
            diseaseId: prediction.diseaseId,
            diseaseName: prediction.diseaseName,
            confidence: prediction.confidence,
            imagePath: req.file.path,
            timestamp: new Date()
        };

        // If user is authenticated, save to history
        if (req.user) {
            const scanHistory = await prisma.scanHistory.create({
                data: {
                    userId: req.user.id,
                    diseaseId: prediction.diseaseId,
                    imagePath: req.file.path,
                    result: JSON.stringify(result),
                    confidence: prediction.confidence
                },
                include: {
                    disease: {
                        select: {
                            name: true,
                            title: true,
                            description: true,
                            symptoms: true,
                            treatment: true
                        }
                    }
                }
            });

            result.scanId = scanHistory.id;
            result.disease = scanHistory.disease;
        } else {
            // Get disease info for anonymous users
            const disease = await prisma.disease.findUnique({
                where: { id: prediction.diseaseId },
                select: {
                    name: true,
                    title: true,
                    description: true,
                    symptoms: true,
                    treatment: true
                }
            });
            result.disease = disease;
        }

        sendSuccess(res, result, 'Image scanned successfully');
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        next(error);
    }
};

const getScanHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [scanHistory, total] = await Promise.all([
            prisma.scanHistory.findMany({
                where: { userId: req.user.id },
                include: {
                    disease: {
                        select: {
                            name: true,
                            title: true,
                            description: true,
                            symptoms: true,
                            treatment: true
                        }
                    }
                },
                orderBy: { scanDate: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.scanHistory.count({
                where: { userId: req.user.id }
            })
        ]);

        const pagination = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
        };

        sendSuccess(res, { scanHistory, pagination }, 'Scan history retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const getScanById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const scan = await prisma.scanHistory.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            },
            include: {
                disease: {
                    select: {
                        name: true,
                        title: true,
                        description: true,
                        symptoms: true,
                        treatment: true
                    }
                }
            }
        });

        if (!scan) {
            return sendError(res, 'Scan not found', 404);
        }

        sendSuccess(res, scan, 'Scan retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const deleteScan = async (req, res, next) => {
    try {
        const { id } = req.params;

        const scan = await prisma.scanHistory.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            }
        });

        if (!scan) {
            return sendError(res, 'Scan not found', 404);
        }

        // Delete image file
        if (scan.imagePath) {
            try {
                await fs.unlink(scan.imagePath);
            } catch (error) {
                console.error('Error deleting image file:', error);
            }
        }

        // Delete scan record
        await prisma.scanHistory.delete({
            where: { id: parseInt(id) }
        });

        sendSuccess(res, null, 'Scan deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    scanImage,
    getScanHistory,
    getScanById,
    deleteScan
};
