document.addEventListener("DOMContentLoaded", async () => {
    // Элементы интерфейса
    const gamesContainer = document.getElementById("games");
    const predictBtn = document.getElementById("predictBtn");
    const resultDiv = document.getElementById("result");
    const avgASpan = document.getElementById("avgA");
    const avgBSpan = document.getElementById("avgB");
    const winnerSpan = document.getElementById("winner");
    const chartCanvas = document.getElementById("chart");
    
    // Создаем элемент загрузки
    const loader = document.createElement("div");
    loader.id = "loader";
    loader.className = "loader hidden";
    loader.innerHTML = `
        <div class="spinner"></div>
        <p>Анализируем данные...</p>
    `;
    document.body.appendChild(loader);

    // Конфигурация
    const gameCount = 10;
    const MODEL_STORAGE_KEY = 'tennis-predictor-model-v2';
    let model;
    let chartInstance = null;

    // Инициализация
    initGameInputs();
    await initModel();

    // ====================== Основные функции ======================

    async function initModel() {
        showLoader();
        try {
            // Пытаемся загрузить сохраненную модель
            const models = await tf.io.listModels();
            if (models.includes(`indexeddb://${MODEL_STORAGE_KEY}`)) {
                model = await tf.loadLayersModel(`indexeddb://${MODEL_STORAGE_KEY}`);
                console.log("Модель загружена из кэша");
                await testModel(); // Проверка работы модели
            } else {
                throw new Error("Модель не найдена в кэше");
            }
        } catch (e) {
            console.log("Обучаем новую модель...", e);
            model = await trainModel();
            await model.save(`indexeddb://${MODEL_STORAGE_KEY}`);
        }
        hideLoader();
    }

    async function trainModel() {
        const { xs, ys } = generateTrainingData(500); // 500 примеров
        const model = createModel();
        
        await model.fit(xs, ys, {
            epochs: 150,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 25 === 0) {
                        console.log(`Эпоха ${epoch + 1}: Ошибка = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        });
        
        return model;
    }

    function createModel() {
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

    function generateTrainingData(samples = 500) {
        const xs = [];
        const ys = [];
        
        // Генерация данных для игрока A (победитель)
        for (let i = 0; i < samples/2; i++) {
            const start = 1.5 + Math.random() * 0.5;
            const game = Array.from({ length: 10 }, (_, j) => {
                return parseFloat((start - j * 0.05 + (Math.random() * 0.1 - 0.05)).toFixed(2));
            });
            xs.push(game);
            ys.push(1);
        }
        
        // Генерация данных для игрока B (победитель)
        for (let i = 0; i < samples/2; i++) {
            const start = 2.0 + Math.random() * 0.5;
            const game = Array.from({ length: 10 }, (_, j) => {
                return parseFloat((start + j * 0.05 + (Math.random() * 0.1 - 0.05)).toFixed(2));
            });
            xs.push(game);
            ys.push(0);
        }
        
        // Перемешиваем данные
        tf.util.shuffleCombo(xs, ys);
        
        return {
            xs: tf.tensor2d(xs),
            ys: tf.tensor1d(ys)
        };
    }

    async function testModel() {
        // Тестовые данные (A должен выиграть)
        const testA = [1.8, 1.75, 1.7, 1.65, 1.6, 1.55, 1.5, 1.45, 1.4, 1.35];
        const testB = [2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55];
        
        const predA = await model.predict(tf.tensor2d([normalizeInput(testA)])).data();
        const predB = await model.predict(tf.tensor2d([normalizeInput(testB)])).data();
        
        console.log("Тест модели:", {
            "A (должен выиграть)": (1 - predA[0]).toFixed(2),
            "B (должен проиграть)": (1 - predB[0]).toFixed(2)
        });
    }

    function initGameInputs() {
        gamesContainer.innerHTML = '';
        
        for (let i = 1; i <= gameCount; i++) {
            const div = document.createElement("div");
            div.className = "game-input";
            div.innerHTML = `
                <input type="number" step="0.01" min="1.0" max="5.0" 
                       placeholder="Гейм ${i} (A)" data-player="a" data-game="${i}">
                <input type="number" step="0.01" min="1.0" max="5.0" 
                       placeholder="Гейм ${i} (B)" data-player="b" data-game="${i}">
            `;
            gamesContainer.appendChild(div);
        }
    }

    async function predictWinner() {
        showLoader();
        
        try {
            const { playerA, playerB } = getInputValues();
            if (playerA.length === 0 || playerB.length === 0) {
                alert("Введите коэффициенты для обоих игроков!");
                return;
            }

            // Нормализация и дополнение данных
            const processedA = processInput(playerA);
            const processedB = processInput(playerB);
            
            // Прогноз
            const predA = await model.predict(tf.tensor2d([processedA])).data();
            const predB = await model.predict(tf.tensor2d([processedB])).data();
            
            // Вероятности победы
            const probA = (1 - predA[0]) * 100;
            const probB = (1 - predB[0]) * 100;
            
            displayResults(probA, probB);
            updateChart(playerA, playerB);
            
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Проверьте введённые данные");
        } finally {
            hideLoader();
        }
    }

    // ====================== Вспомогательные функции ======================

    function getInputValues() {
        const inputs = document.querySelectorAll('input[type="number"]');
        const playerA = [];
        const playerB = [];
        
        inputs.forEach(input => {
            const value = parseFloat(input.value);
            if (!isNaN(value) && value >= 1.0 && value <= 5.0) {
                input.dataset.player === 'a' 
                    ? playerA.push(value) 
                    : playerB.push(value);
            }
        });
        
        return { playerA, playerB };
    }

    function processInput(values) {
        // Дополняем до 10 значений средним
        const padded = padArray(values, 10);
        // Нормализуем
        return normalizeInput(padded);
    }

    function padArray(arr, length) {
        if (arr.length >= length) return arr.slice(0, length);
        
        const avg = arr.length > 0 
            ? arr.reduce((a, b) => a + b, 0) / arr.length 
            : 1.5;
            
        return [...arr, ...Array(length - arr.length).fill(avg)];
    }

    function normalizeInput(values) {
        // Инвертируем и масштабируем коэффициенты (1.0 -> 1.0, 5.0 -> 0.0)
        return values.map(x => (5.0 - x) / 4.0);
    }

    function displayResults(probA, probB) {
        const winner = probA > probB ? "Игрок A" : "Игрок B";
        const confidence = Math.max(probA, probB);
        
        avgASpan.textContent = probA.toFixed(1) + '%';
        avgBSpan.textContent = probB.toFixed(1) + '%';
        winnerSpan.textContent = `${winner} (${confidence.toFixed(1)}% уверенность)`;
        
        resultDiv.classList.remove("hidden");
    }

    function updateChart(valuesA, valuesB) {
        if (chartInstance) chartInstance.destroy();
        
        const ctx = chartCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: Math.max(valuesA.length, valuesB.length) }, (_, i) => `Гейм ${i + 1}`),
                datasets: [
                    {
                        label: 'Игрок A',
                        data: valuesA,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Игрок B',
                        data: valuesB,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#fff' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    },
                    y: { 
                        min: 1.0,
                        max: 5.0,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    }
                }
            }
        });
    }

    function showLoader() {
        loader.classList.remove("hidden");
    }

    function hideLoader() {
        loader.classList.add("hidden");
    }

    // Обработчики событий
    predictBtn.addEventListener("click", predictWinner);
});
