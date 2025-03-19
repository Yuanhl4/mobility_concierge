const weights = {
    safety: 3,
    cost: 2,
    lessTransfer: 5,
    time: 1,
    lessWalking: 4
};

function validateWeights() {
    const requiredWeights = ['safety', 'cost', 'lessTransfer', 'time', 'lessWalking'];
    const missingWeights = requiredWeights.filter(w => !(w in weights));
    
    if (missingWeights.length > 0) {
        console.error('Missing weights:', missingWeights);
        return false;
    }
    
    for (const [key, value] of Object.entries(weights)) {
        if (typeof value !== 'number' || value < 0) {
            console.error(`Invalid weight value for ${key}:`, value);
            return false;
        }
    }
    
    console.log('Weights validated successfully:', weights);
    return true;
}

window.weights = weights;
window.validateWeights = validateWeights;

validateWeights();  