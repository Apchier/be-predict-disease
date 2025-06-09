const tf = require('@tensorflow/tfjs');
const { createCanvas, loadImage } = require('canvas');

let model = null;

const loadModel = async () => {
    if (!model) {
        const modelPath = 'http://localhost:3000/models/model.json';
        console.log("Loading model from:", modelPath);
        try {
            model = await tf.loadGraphModel(modelPath);
            console.log("Model loaded successfully");
            console.log("Model input shape:", model.inputs[0].shape);

            // Cek apakah model memiliki metadata
            if (model.modelTopology && model.modelTopology.metadata) {
                console.log("Model metadata:", model.modelTopology.metadata);
            }

            // Cek signature jika ada
            if (model.signature) {
                console.log("Model signature:", model.signature);
            }

        } catch (error) {
            console.error('Error loading model:', error);
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }
    return model;
};


const processImage = async (imagePath) => {
    try {
        // Load image menggunakan canvas
        const image = await loadImage(imagePath);
        console.log(`Original image size: ${image.width}x${image.height}`);

        // Buat canvas dengan ukuran 256x256 
        const canvas = createCanvas(256, 256); 
        const ctx = canvas.getContext('2d');

        // Draw dan resize image ke 256x256
        ctx.drawImage(image, 0, 0, 256, 256); 

        // Get image data
        const imageData = ctx.getImageData(0, 0, 256, 256); 
        const data = imageData.data;

        // Convert RGBA ke RGB menggunakan Uint8Array
        const rgbData = new Uint8Array(256 * 256 * 3); 
        let rgbIndex = 0;

        for (let i = 0; i < data.length; i += 4) {
            rgbData[rgbIndex++] = data[i];     
            rgbData[rgbIndex++] = data[i + 1]; 
            rgbData[rgbIndex++] = data[i + 2]; 
        }

        // Create tensor dari Uint8Array dengan shape [256, 256, 3]
        const imgTensor = tf.tensor3d(rgbData, [256, 256, 3]); 

        // Convert ke float dan normalize
        const floatTensor = imgTensor.toFloat();
        const normalizedTensor = floatTensor.div(tf.scalar(255));

        // Add batch dimension 
        const inputTensor = normalizedTensor.expandDims(0);

        console.log("Input tensor shape:", inputTensor.shape);

        // Cleanup
        imgTensor.dispose();
        floatTensor.dispose();
        normalizedTensor.dispose();

        return inputTensor;
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error(`Failed to process image: ${error.message}`);
    }
};

const predictDisease = async (imagePath) => {
    try {
        console.log("Starting prediction for:", imagePath);

        let attempts = 0;
        const maxAttempts = 3;

        while (!model && attempts < maxAttempts) {
            attempts++;
            console.log(`Loading model attempt ${attempts}/${maxAttempts}`);

            try {
                await loadModel();
                if (model) {
                    console.log("Model loaded successfully on attempt", attempts);
                    break;
                }
            } catch (error) {
                console.error(`Model loading attempt ${attempts} failed:`, error.message);
                if (attempts === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!model) {
            throw new Error("Failed to load model after multiple attempts");
        }

        console.log("Processing image...");
        const inputTensor = await processImage(imagePath);

        console.log("Making prediction...");

        console.log("Final input shape before prediction:", inputTensor.shape);

        const predictions = model.predict(inputTensor);

        const predData = await predictions.data();
        const predictedClass = predData.indexOf(Math.max(...predData));
        const confidence = predData[predictedClass];

        const diseaseMapping = {
            0: { diseaseId: 1, diseaseName: 'Bercak', confidence }, 
            1: { diseaseId: 2, diseaseName: 'Hawar', confidence },   
            2: { diseaseId: 3, diseaseName: 'Karat', confidence },   
            3: { diseaseId: 4, diseaseName: 'Sehat', confidence }    
        };

        // Cleanup tensors
        inputTensor.dispose();
        predictions.dispose();

        return diseaseMapping[predictedClass] || { diseaseId: null, diseaseName: 'Unknown', confidence: 0 };

    } catch (error) {
        console.error('Error in predictDisease:', error);
        throw error;
    }
};

module.exports = {
    predictDisease,
};
