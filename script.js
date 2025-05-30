document.addEventListener("DOMContentLoaded", () => {
  const gameCount = 3;
  const gamesContainer = document.getElementById("games");
  const predictBtn = document.getElementById("predictBtn");
  const resultDiv = document.getElementById("result");
  const avgASpan = document.getElementById("avgA");
  const avgBSpan = document.getElementById("avgB");
  const winnerSpan = document.getElementById("winner");

  // Создаем поля ввода только для игрока A (пользователя)
  for (let i = 1; i <= gameCount; i++) {
    const div = document.createElement("div");
    div.className = "game-input";
    div.innerHTML = `
      <p><strong>Гейм ${i}</strong></p>
      <input type="text" inputmode="numeric" placeholder="Коэффициент A (Вы)" data-player="a" data-id="${i}" maxlength="5">
    `;
    gamesContainer.appendChild(div);
  }

  const inputs = document.querySelectorAll("input[type='text']");
  inputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      let value = e.target.value;
      value = value.replace(/[^0-9,]/g, "");

      if (!value.includes(",") && value.length >= 1) {
        value = value.length > 1 ? value[0] + "," : value + ",";
      }

      if (value.includes(",")) {
        const parts = value.split(",");
        if (parts[1].length > 2) {
          parts[1] = parts[1].slice(0, 2);
        }
        value = `${parts[0]},${parts[1]}`;
      }

      if (value.length > 5) {
        value = value.slice(0, 5);
      }

      e.target.value = value;

      if (value.includes(",") && value.split(",")[1].length === 2) {
        const nextInput = inputs[index + 1];
        if (nextInput) {
          nextInput.focus();
        } else {
          e.target.blur();
        }
      }
    });

    input.addEventListener("focus", () => input.select());
  });

  predictBtn.addEventListener("click", () => {
    const inputs = document.querySelectorAll("input[data-player='a']");
    let totalA = 0;
    let totalB = 0;
    let validGames = 0;

    inputs.forEach((input) => {
      const valStr = input.value.replace(",", ".");
      const val = parseFloat(valStr);
      if (!isNaN(val)) {
        totalA += val;

        // ИИ делает ставку — агрессивно или с поправкой
        let aiValue;
        if (val > 1.8) {
          aiValue = (val - 0.4); // игрок слабеет → ИИ атакует
        } else if (val < 1.5) {
          aiValue = (val + 0.3); // игрок уверен → ИИ осторожен
        } else {
          aiValue = val;
        }

        totalB += aiValue;
        validGames++;
      }
    });

    if (validGames === 0) {
      alert("Введите хотя бы один коэффициент.");
      return;
    }

    const avgA = (totalA / validGames).toFixed(2);
    const avgB = (totalB / validGames).toFixed(2);

    let winner = "Ничья";
    if (avgA < avgB) {
      winner = "Игрок A (Вы)";
    } else if (avgB < avgA) {
      winner = "Игрок B (ИИ)";
    }

    avgASpan.textContent = avgA;
    avgBSpan.textContent = avgB;
    winnerSpan.textContent = winner;

    resultDiv.classList.remove("hidden");
  });
});

