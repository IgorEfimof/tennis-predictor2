document.addEventListener("DOMContentLoaded", async () => {
  const gameCount = 10;
  const gamesContainer = document.getElementById("games");
  const predictBtn = document.getElementById("predictBtn");
  const resultDiv = document.getElementById("result");
  const avgASpan = document.getElementById("avgA");
  const avgBSpan = document.getElementById("winner");
  const winnerSpan = document.getElementById("winner");
  const chartCanvas = document.getElementById("chart");
  let chartInstance = null;

  // Создаем поля для геймов
  for (let i = 1; i <= gameCount; i++) {
    const div = document.createElement("div");
    div.className = "game-input";
    div.innerHTML = `
      <input type="text" inputmode="numeric" placeholder="Коэф. A" data-player="a" data-id="${i}" maxlength="5">
      <input type="text" inputmode="numeric" placeholder="Коэф. B" data-player="b" data-id="${i}" maxlength="5">
    `;
    gamesContainer.appendChild(div);
  }

  const inputs = document.querySelectorAll("input[type='text']");

  // Логика ввода
  inputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      let value = e.target.value.replace(/[^0-9,]/g, "");
      if (!value.includes(",")) {
        if (value.length === 1) {
          value += ",";
        } else if (value.length > 1) {
          value = value[0] + ",";
        }
      } else {
        const parts = value.split(",");
        if (parts[1].length > 2) {
          parts[1] = parts[1].substring(0, 2);
          value = parts.join(",");
        }
      }
      e.target.value = value;
      if (value.includes(",") && value.split(",")[1].length === 2) {
        const nextInput = inputs[index + 1];
        if (nextInput) {
          nextInput.focus();
        } else {
          e.target.blur(); // Скрываем клавиатуру на iPad
        }
      }
    });

    input.addEventListener("focus", () => {
      input.select();
    });
  });

  // Создаем нейросеть
  const createModel = () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    return model;
  };

  const model = createModel();

  // Расширенные данные для обучения
  const xs = tf.tensor2d([
    [2.1, 2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2],
    [1.9, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1],
    [2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.8, 1.7, 1.6],
    [1.8, 1.7, 1.7, 1.6, 1.6, 1.5, 1.5, 1.4, 1.4, 1.3],
    [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7],
    [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9],
    [3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1],
    [2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4]
  ]);

  const ys = tf.tensor1d([1, 1, 1, 1, 0, 0, 0, 0]); // 1 - Игрок A, 0 - Игрок B

  await model.fit(xs, ys, {
    epochs: 50,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0) {
          console.log(`Epoch ${epoch + 1}: Loss = ${logs.loss.toFixed(4)}, Accuracy = ${(logs.acc * 100).toFixed(2)}%`);
        }
      }
    }
  });

  // Функции обработки данных
  const normalize = (arr) => {
    if (arr.length === 0) return [];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const divisor = max - min < 0.1 ? 0.1 : max - min;
    return arr.map(x => (x - min) / divisor);
  };

  const weightedAvg = (arr, ws) => {
    if (arr.length === 0 || ws.length === 0) return 0;
    const effectiveLength = Math.min(arr.length, ws.length);
    const normalizedArr = normalize(arr.slice(0, effectiveLength));
    const weightedSum = normalizedArr.reduce((sum, val, i) => sum + val * ws[i], 0);
    const weightSum = ws.slice(0, effectiveLength).reduce((a, b) => a + b, 0);
    return weightedSum / weightSum;
  };

  const trend = (arr) => {
    if (arr.length < 2) return 0;
    const slopes = arr.slice(1).map((v, i) => v - arr[i]);
    const avgSlope = slopes.reduce((sum, d) => sum + d, 0) / slopes.length;
    const avgValue = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    return avgSlope / (avgValue || 1);
  };

  const stability = (arr) => {
    if (arr.length < 2) return 0;
    const diffs = arr.slice(1).map((v, i) => Math.abs(v - arr[i]));
    const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    const avgValue = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    return 1 - (avgDiff / (avgValue || 1));
  };

  const varianceAnalysis = (arr) => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    const squaredDeviations = arr.map(v => Math.pow(v - mean, 2));
    const variance = squaredDeviations.reduce((sum, v) => sum + v, 0) / arr.length;
    return 1 - (variance / (mean * mean + 0.1));
  };

  const predictProbability = async (valuesA, valuesB) => {
    if (valuesA.length === 0 && valuesB.length === 0) return { winner: "Ничья", confidence: 0 };
    const weights = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1];
    const avgA = weightedAvg(valuesA, weights);
    const avgB = weightedAvg(valuesB, weights);
    const trendA = trend(valuesA);
    const trendB = trend(valuesB);
    const stableA = stability(valuesA);
    const stableB = stability(valuesB);
    const varA = varianceAnalysis(valuesA);
    const varB = varianceAnalysis(valuesB);
    const predictionA = await model.predict(tf.tensor2d([normalize(valuesA)])).data();
    const predictionB = await model.predict(tf.tensor2d([normalize(valuesB)])).data();

    const weightAvg = 0.3;
    const weightTrend = 0.2;
    const weightStability = 0.2;
    const weightVariance = 0.2;
    const weightAI = 0.1;

    const ratingA =
      weightAvg * avgA +
      weightTrend * (trendA > 0 ? 1 : 0) +
      weightStability * stableA +
      weightVariance * varA +
      weightAI * predictionA[0];

    const ratingB =
      weightAvg * avgB +
      weightTrend * (trendB > 0 ? 1 : 0) +
      weightStability * stableB +
      weightVariance * varB +
      weightAI * predictionB[0];

    let winner = "Ничья";
    let confidence = 0;

    if (ratingA > ratingB) {
      winner = "Игрок A";
      confidence = ratingA / (ratingA + ratingB);
    } else if (ratingB > ratingA) {
      winner = "Игрок B";
      confidence = ratingB / (ratingA + ratingB);
    }

    return {
      winner,
      confidence: confidence * 100,
      stats: {
        avgA: avgA.toFixed(2),
        avgB: avgB.toFixed(2)
      }
    };
  };

  predictBtn.addEventListener("click", async () => {
    const valuesA = [];
    const valuesB = [];

    inputs.forEach((input) => {
      const valueStr = input.value.replace(/,/g, ".");
      const value = parseFloat(valueStr);
      if (!isNaN(value)) {
        if (input.dataset.player === "a") {
          valuesA.push(value);
        } else {
          valuesB.push(value);
        }
      }
    });

    if (valuesA.length === 0 && valuesB.length === 0) {
      alert("Введите хотя бы один коэффициент.");
      return;
    }

    const { winner, confidence, stats } = await predictProbability(valuesA, valuesB);

    avgASpan.textContent = stats.avgA;
    avgBSpan.textContent = stats.avgB;
    winnerSpan.textContent = `${winner} (${confidence.toFixed(1)}% уверенность)`;
    resultDiv.classList.remove("hidden");

    if (chartInstance) chartInstance.destroy();

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: gameCount }, (_, i) => `Гейм ${i + 1}`),
        datasets: [
          {
            label: 'Игрок A',
            data: valuesA,
            borderColor: '#4f46e5',
            fill: false,
            tension: 0.3
          },
          {
            label: 'Игрок B',
            data: valuesB,
            borderColor: '#ec4899',
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false
          }
        },
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          }
        }
      }
    });
  });
});
