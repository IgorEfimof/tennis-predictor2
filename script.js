document.addEventListener("DOMContentLoaded", async () => {
  // Конфигурация
  const config = {
    gameCount: 3,
    useAdvancedModel: false, // Переключение между простой и сложной версией
    decimalSeparator: ',',
  };

  // Элементы DOM
  const gamesContainer = document.getElementById("games");
  const predictBtn = document.getElementById("predictBtn");
  const resultDiv = document.getElementById("result");
  const avgASpan = document.getElementById("avgA");
  const avgBSpan = document.getElementById("avgB");
  const winnerSpan = document.getElementById("winner");
  const chartCanvas = document.getElementById("chart");

  // Инициализация полей ввода
  const initInputs = () => {
    gamesContainer.innerHTML = '';
    for (let i = 1; i <= config.gameCount; i++) {
      const div = document.createElement("div");
      div.className = "game-input";
      div.innerHTML = `
        <p>Гейм ${i}</p>
        <input type="text" placeholder="A" data-player="a" data-id="${i}" inputmode="decimal">
        <input type="text" placeholder="B" data-player="b" data-id="${i}" inputmode="decimal">
      `;
      gamesContainer.appendChild(div);
    }
    setupInputHandlers();
  };

  // Обработчики ввода
  const setupInputHandlers = () => {
    const inputs = document.querySelectorAll("input[type='text']");
    inputs.forEach((input, index) => {
      input.addEventListener("input", (e) => handleInput(e, index));
      input.addEventListener("focus", () => input.select());
    });
  };

  // Форматирование ввода x.xx
  const handleInput = (e, index) => {
    let value = e.target.value.replace(/[^0-9,]/g, '');
    
    // Автодобавление разделителя
    if (!value.includes(config.decimalSeparator) && value.length > 1) {
      value = value.slice(0, 1) + config.decimalSeparator + value.slice(1);
    }

    // Ограничение 2 знаков после запятой
    if (value.includes(config.decimalSeparator)) {
      const parts = value.split(config.decimalSeparator);
      if (parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
        value = parts.join(config.decimalSeparator);
      }
    }

    e.target.value = value;

    // Автопереход к следующему полю
    if (value.length === 4 && index < config.gameCount * 2 - 1) {
      const nextInput = document.querySelectorAll("input[type='text']")[index + 1];
      nextInput?.focus();
    }
  };

  // Прогноз (простая версия)
  const simplePredict = (valuesA, valuesB) => {
    const avgA = (valuesA.reduce((a, b) => a + b, 0) / valuesA.length).toFixed(2);
    const avgB = (valuesB.reduce((a, b) => a + b, 0) / valuesB.length).toFixed(2);
    return {
      winner: avgA < avgB ? "Игрок A" : avgB < avgA ? "Игрок B" : "Ничья",
      avgA,
      avgB,
    };
  };

  // Прогноз (расширенная версия с TensorFlow.js)
  const advancedPredict = async (valuesA, valuesB) => {
    if (typeof tf === 'undefined') {
      console.warn("TensorFlow.js не загружен. Используется простой режим.");
      return simplePredict(valuesA, valuesB);
    }

    // Здесь должна быть ваша ML-логика
    // Для примера возвращаем простой расчёт
    return simplePredict(valuesA, valuesB);
  };

  // Обработчик кнопки
  predictBtn.addEventListener("click", _.debounce(async () => {
    const inputs = document.querySelectorAll("input[type='text']");
    const valuesA = [];
    const valuesB = [];

    inputs.forEach(input => {
      const value = parseFloat(input.value.replace(config.decimalSeparator, '.'));
      if (!isNaN(value)) {
        input.dataset.player === "a" ? valuesA.push(value) : valuesB.push(value);
      }
    });

    if (valuesA.length === 0 || valuesB.length === 0) {
      alert("Заполните коэффициенты для обоих игроков!");
      return;
    }

    const result = config.useAdvancedModel 
      ? await advancedPredict(valuesA, valuesB) 
      : simplePredict(valuesA, valuesB);

    avgASpan.textContent = result.avgA;
    avgBSpan.textContent = result.avgB;
    winnerSpan.textContent = result.winner;
    resultDiv.classList.remove("hidden");
  }, 300));

  // Инициализация
  initInputs();
});
