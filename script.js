document.addEventListener("DOMContentLoaded", async () => {
    // Элементы интерфейса
    const gamesContainer = document.getElementById("games");
    const predictBtn = document.getElementById("predictBtn");
    const resultDiv = document.getElementById("result");
    const avgASpan = document.getElementById("avgA");
    const avgBSpan = document.getElementById("avgB");
    const winnerSpan = document.getElementById("winner");
    const chartCanvas = document.getElementById("chart");
    const loader = document.getElementById("loader");
    
    let model;
    let chartInstance = null;
    const gameCount = 10;

    // Инициализация
    initGameInputs();
    initModel();

    // Функции
    async function initModel() {
        showLoader();
        model = await loadModel();
        if (!model) {
            model = await trainNewModel();
            await saveModel(model);
        }
        hideLoader();
    }

    async function loadModel() {
        try {
            const models = await tf.io.listModels();
            if (models.length > 0) {
                return await tf.loadLayersModel(models[0]);
            }
        } catch (e) {
            console.warn("Не удалось загрузить модель:", e);
        }
        return null;
    }

    async function trainNewModel() {
        const { xs, ys } = generateTrainingData();
        const model = createEnhancedModel();
        
        await model.fit(xs, ys, {
            epochs: 150,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 25 === 0) {
                        console.log(`Epoch ${epoch + 1}: Loss = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        });
        
        return model;
    }

    function createEnhancedModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({
            inputShape: [10],
            units: 64,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }));
        model.add(tf.layers.dropout({ rate: 0.3 }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }

    function generateTrainingData() {
        const samples = 250;
        const xs = [];
        const ys = [];
        
        const patterns = [
            { start: 1.8, trend: -0.04, noise: 0.1 },
            { start: 2.3, trend: 0.05, noise: 0.15 },
            { start: 2.0, trend: 0.0, noise: 0.2 },
        ];

        for (let i = 0; i < samples; i++) {
            const pattern = patterns[i % patterns.length];
            const game = Array.from({ length: 10 }, (_, j) => {
                const value = pattern.start + (j * pattern.trend);
                return +(value + (Math.random() * pattern.noise * 2 - pattern.noise)).toFixed(2);
            });
            
            xs.push(game);
            ys.push(pattern.trend <= 0 ? 1 : 0);
        }

        return { xs: tf.tensor2d(xs), ys: tf.tensor1d(ys) };
    }

    function initGameInputs() {
        gamesContainer.innerHTML = '';
        for (let i = 1; i <= gameCount; i++) {
            const div = document.createElement("div");
            div.className = "game-input";
            div.innerHTML = `
                <input type="text" inputmode="decimal" placeholder="1.50" 
                       data-player="a" data-id="${i}" pattern="[1-5](\.[0-9]{1,2})?">
                <input type="text" inputmode="decimal" placeholder="2.50" 
                       data-player="b" data-id="${i}" pattern="[1-5](\.[0-9]{1,2})?">
            `;
            gamesContainer.appendChild(div);
        }
        
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', validateInput);
        });
    }

    function validateInput(e) {
        const value = e.target.value.replace(',', '.');
        if (!/^[1-5](\.[0-9]{0,2})?$/.test(value)) {
            e.target.value = value.substring(0, value.length - 1);
        } else {
            e.target.value = value;
        }
    }

    // ... (остальные функции остаются аналогичными, но с улучшенной логикой)
});
