document.addEventListener("DOMContentLoaded", async () => {
    // ====================== Элементы интерфейса ======================
    const gamesContainer = document.getElementById("games");
    const predictBtn = document.getElementById("predictBtn");
    const resultDiv = document.getElementById("result");
    const avgASpan = document.getElementById("avgA");
    const avgBSpan = document.getElementById("avgB");
    const winnerSpan = document.getElementById("winner");
    const chartCanvas = document.getElementById("chart");
    const loader = document.createElement("div");
    loader.id = "loader";
    loader.className = "loader hidden";
    loader.innerHTML = `
        <div class="spinner"></div>
        <p>Анализируем данные...</p>
    `;
    document.body.appendChild(loader);

    // ====================== Конфигурация ======================
    const gameCount = 10;
    const MODEL_STORAGE_KEY = 'tennis-predictor-model';
    let model;
    let chartInstance = null;

    // ====================== Инициализация ======================
    initGameInputs();
    await initModel();

    // ====================== Основные функции ======================

    // Инициализация модели (загрузка или обучение)
    async function initModel() {
        showLoader();
        try {
            // Пытаемся загрузить сохраненную модель
            model = await tf.loadLayersModel(`indexeddb://${MODEL_STORAGE_KEY}`);
            console.log("Модель загружена из кэша");
        } catch (e) {
            console.log("Обучаем новую модель...");
            model = await trainModel();
            await model.save(`indexeddb://${MODEL_STORAGE_KEY}`);
        }
        hideLoader();
    }

    // Обучение новой модели
    async function trainModel() {
        const { xs, ys } = generateTrainingData(300); // 300 примеров
        const model = createModel();
        
        await model.fit(xs, ys, {
            epochs: 100,
            batchSize: 16,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 20 === 0) {
                        console.log(`Эпоха ${epoch + 1}: Ошибка = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        });
        
        return model;
    }

    // Создание архитектуры модели
    function createModel() {
        const model = tf.sequential();
        
        // Улучшенная архитектура:
        model.add(tf.layers.dense({
            inputShape: [10],
            units: 48,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }

    // Генерация данных для обучения
    function generateTrainingData(samples = 200) {
        const xs = [];
        const ys = [];
        
        // Паттерны для разных сценариев:
        const patterns = [
            // Игрок A сильнее (нисходящий тренд)
            { start: 1.7, trend: -0.03, noise: 0.08, label: 1 },
            // Игрок B сильнее (восходящий тренд)
            { start: 2.2, trend: 0.04, noise: 0.12, label: 0 },
            // Близкие соперники
            { start: 1.9, trend: 0.0, noise: 0.15, label: Math.random() > 0.5 ? 1 : 0 }
        ];

        for (let i = 0; i < samples; i++) {
            const pattern = patterns[i % patterns.length];
            const coefficients = Array.from({ length: 10 }, (_, j) => {
                const baseValue = pattern.start + (j * pattern.trend);
                const noise = (Math.random() * 2 - 1) * pattern.noise;
                return parseFloat((baseValue + noise).toFixed(2));
            });
            
            xs.push(coefficients);
            ys.push(pattern.label);
        }

        return {
            xs: tf.tensor2d(xs),
            ys: tf.tensor1d(ys)
        };
    }

    // Инициализация полей ввода
    function initGameInputs() {
        gamesContainer.innerHTML = '';
        
        for (let i = 1; i <= gameCount; i++) {
            const gameDiv = document.createElement("div");
            gameDiv.className = "game-input";
            gameDiv.innerHTML = `
                <input type="text" inputmode="decimal" 
                       placeholder="Гейм ${i} (A)" 
                       data-player="a" data-game="${i}"
                       pattern="[1-5](\\.[0-9]{1,2})?">
                <input type="text" inputmode="decimal" 
                       placeholder="Гейм ${i} (B)" 
                       data-player="b" data-game="${i}"
                       pattern="[1-5](\\.[0-9]{1,2})?">
            `;
            gamesContainer.appendChild(gameDiv);
        }

        // Валидация ввода
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(',', '.');
                
                // Проверка формата (1.00 - 5.99)
                if (!/^[1-5](\.[0-9]{0,2})?$/.test(value)) {
                    value = value.substring(0, value.length - 1);
                }
                
                // Ограничение значений
                const numValue = parseFloat(value);
                if (numValue > 5.99) value = '5.99';
                if (numValue < 1.0) value = '1.0';
                
                e.target.value = value;
            });
        });
    }

    // Прогнозирование победителя
    async function predictWinner() {
        showLoader();
        
        try {
            const { playerA, playerB } = getInputValues();
            if (playerA.length === 0 && playerB.length === 0) {
                alert("Введите коэффициенты хотя бы для одного игрока!");
                return;
            }

            // Нормализация данных
            const normalizedA = normalizeCoefficients(playerA);
            const normalizedB = normalizeCoefficients(playerB);
            
            // Прогноз с помощью модели
            const predictionA = await model.predict(tf.tensor2d([normalizedA])).data();
            const predictionB = await model.predict(tf.tensor2d([normalizedB])).data();
            
            // Анализ результатов
            const confidenceA = predictionA[0] * 100;
            const confidenceB = (1 - predictionB[0]) * 100;
            
            displayResults(confidenceA, confidenceB);
            updateChart(playerA, playerB);
            
        } catch (error) {
            console.error("Ошибка прогнозирования:", error);
            alert("Произошла ошибка при анализе данных");
        } finally {
            hideLoader();
        }
    }

    // ====================== Вспомогательные функции ======================

    function getInputValues() {
        const inputs = document.querySelectorAll('input[type="text"]');
        const playerA = [];
        const playerB = [];
        
        inputs.forEach(input => {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                input.dataset.player === 'a' 
                    ? playerA.push(value) 
                    : playerB.push(value);
            }
        });
        
        return { playerA, playerB };
    }

    function normalizeCoefficients(coeffs) {
        if (coeffs.length === 0) return Array(10).fill(0);
        
        // Заполнение недостающих значений средним
        while (coeffs.length < 10) {
            const avg = coeffs.reduce((a, b) => a + b, 0) / coeffs.length;
            coeffs.push(avg || 0);
        }
        
        // Min-max нормализация
        const min = Math.min(...coeffs);
        const max = Math.max(...coeffs);
        return coeffs.map(x => (x - min) / (max - min || 1));
    }

    function displayResults(confidenceA, confidenceB) {
        const winner = confidenceA > confidenceB ? "Игрок A" : "Игрок B";
        const confidence = Math.max(confidenceA, confidenceB);
        
        avgASpan.textContent = confidenceA.toFixed(1) + '%';
        avgBSpan.textContent = confidenceB.toFixed(1) + '%';
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
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Игрок B',
                        data: valuesB,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: getChartOptions()
        });
    }

    function getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { 
                    min: 1.0,
                    max: 5.0,
                    grid: { color: 'rgba(255,255,255,0.1)' } 
                }
            }
        };
    }

    function showLoader() {
        loader.classList.remove("hidden");
    }

    function hideLoader() {
        loader.classList.add("hidden");
    }

    // ====================== Обработчики событий ======================
    predictBtn.addEventListener("click", predictWinner);
});
