const prisma = require('../config/database');
const tf = require('@tensorflow/tfjs'); // Import TensorFlow.js
const fs = require('fs');
let model;

// Load the model once when the service starts
const loadModel = async () => {
    try {
        model = await tf.loadLayersModel('file://src/models/Model_CNN_256px.keras');
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
    }
};

// Call loadModel on start
loadModel();

const predictDisease = async (imagePath) => {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const tensor = tf.node.decodeImage(imageBuffer, 3); // Assuming RGB

        // Preprocess the image (resize, normalization, etc.)
        const resizedImage = tf.image.resizeBilinear(tensor, [256, 256]).expandDims(0); // Adjust dimensions as required
        const normalizedImage = resizedImage.div(255.0); // Normalize to [0, 1]

        // Make prediction
        const prediction = model.predict(normalizedImage);
        const predictedClass = prediction.argMax(-1).dataSync()[0]; // Get class with maximum confidence

        // Fetch disease info from database
        const diseases = await prisma.disease.findMany();
        const disease = diseases[predictedClass];

        // Mock confidence score (can be adjusted to provide actual prediction probability)
        const confidence = prediction.dataSync()[predictedClass]; // Use the prediction result directly

        return {
            diseaseId: disease.id,
            diseaseName: disease.name,
            confidence: parseFloat(confidence.toFixed(2))
        };
    } catch (error) {
        console.error('ML Prediction error:', error);
        throw new Error('Failed to predict disease');
    }
};

module.exports = {
    predictDisease
};
