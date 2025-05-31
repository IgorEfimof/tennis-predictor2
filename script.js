document.addEventListener("DOMContentLoaded", () => {
  const maxRounds = 10;
  let currentRound = 1;

  const gamesContainer = document.getElementById("games");
  const nextRoundBtn = document.getElementById("nextRoundBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultDiv = document.getElementById("result");
  const avgPlayerSpan = document.getElementById("avgPlayer");
  const avgAISpan = document.getElementById("avgAI");
  const winnerSpan = document.getElementById("winner");
  const gameStatus = document.getElementById("gameStatus");
  const aiVerdictSpan = document.getElementById("aiVerdict");

  const roundsData = [];

  function createRoundInputs(round) {
    gamesContainer.innerHTML = "";

    const div = document.createElement("div");
    div.className = "game-input";

    div.innerHTML = `
      <label for="playerInput">Коэффициент Игрока (x,xx):</label>
      <input id="playerInput" type="text" inputmode="numeric" maxlength="5" placeholder="например 1,23" autocomplete="off" />
      <label>Коэффициент ИИ:</label>
      <input id="aiInput" type="text" disabled value="--" style="background:#444; color:#aaa; text-align:center;" />
    `;

    gamesContainer.appendChild(div);

    const playerInput = document.getElementById("playerInput");
    const aiInput = document.getElementById("aiInput");

    playerInput.addEventListener("input", (e) => {
      let val = e.target.value;
      val = val.replace(/[^0-9,]/g, "");
      if (!val.includes(",") && val.length > 0) {
        if (val.length > 1) val = val[0] + ",";
        else val += ",";
      }
      if (val.includes(",")) {
        const parts = val.split(",");
        if (parts[1].length > 2) parts[1] = parts[1].slice(0, 2);
        val = parts[0] + "," + parts[1];
      }
      if (val.length > 5) val = val.slice(0, 5);
      e.target.value = val;
    });

    return { playerInput, aiInput };
  }

  function calculateAICoefficient() {
    if (roundsData.length === 0) return 1.50;
    const avgPlayer = roundsData.reduce((acc, r) => acc + r.player, 0) / roundsData.length;
    let aiCoef = avgPlayer - 0.05;
    if (aiCoef < 1.01) aiCoef = 1.01;
    const randOffset = (Math.random() * 0.02) - 0.01;
    aiCoef += randOffset;
    return parseFloat(aiCoef.toFixed(2));
  }

  function startRound() {
    gameStatus.textContent = `Гейм ${currentRound} из ${maxRounds}`;
    const { playerInput, aiInput } = createRoundInputs(currentRound);
    aiInput.value = "--";
    nextRoundBtn.disabled = true;
    playerInput.focus();

    playerInput.addEventListener("input", () => {
      const valStr = playerInput.value.replace(",", ".");
      const val = parseFloat(valStr);
      nextRoundBtn.disabled = isNaN(val) || val < 1 || val > 10;
    });

    nextRoundBtn.onclick = () => {
      const valStr = playerInput.value.replace(",", ".");
      const playerCoef = parseFloat(valStr);
      if (isNaN(playerCoef) || playerCoef < 1 || playerCoef > 10) {
        alert("Введите корректный коэффициент от 1.00 до 10.00");
        return;
      }

      const aiCoef = calculateAICoefficient();
      aiInput.value = aiCoef.toFixed(2);

      roundsData.push({ player: playerCoef, ai: aiCoef });

      nextRoundBtn.disabled = true;
      if (currentRound < maxRounds) {
        currentRound++;
        setTimeout(startRound, 1000);
      } else {
        showResult();
      }
    };
  }

  function showResult() {
    gamesContainer.innerHTML = "";
    nextRoundBtn.classList.add("hidden");
    resetBtn.classList.remove("hidden");
    gameStatus.textContent = "Игра завершена!";

    const avgPlayer = roundsData.reduce((acc, r) => acc + r.player, 0) / roundsData.length;
    const avgAI = roundsData.reduce((acc, r) => acc + r.ai, 0) / roundsData.length;

    avgPlayerSpan.textContent = avgPlayer.toFixed(2);
    avgAISpan.textContent = avgAI.toFixed(2);

    let winner = "Ничья";
    if (avgPlayer < avgAI) winner = "Игрок";
    else if (avgAI < avgPlayer) winner = "ИИ";
    winnerSpan.textContent = winner;

    const probabilities = roundsData.map(r => 1 / r.player);
    const avgProbability = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
    const lastPlayerCoef = roundsData[roundsData.length - 1].player;
    const impliedProb = 1 / lastPlayerCoef;

    let verdict = "Коэффициент реалистичен";
    const diff = avgProbability - impliedProb;
    if (diff > 0.05) verdict = "Игрок недооценён";
    else if (diff < -0.05) verdict = "Игрок переоценён";

    aiVerdictSpan.textContent = verdict;
    resultDiv.classList.remove("hidden");
  }

  resetBtn.onclick = () => {
    currentRound = 1;
    roundsData.length = 0;
    resultDiv.classList.add("hidden");
    nextRoundBtn.classList.remove("hidden");
    resetBtn.classList.add("hidden");
    startRound();
  };

  startRound();
});
