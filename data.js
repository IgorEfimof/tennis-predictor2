// Фейковые данные (замените реальными из API)
export const historicalMatches = [
  {
    playerA: "Игрок 1",
    playerB: "Игрок 2",
    oddsA: [1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 1.0],
    oddsB: [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0],
    winner: "A" // 'A' или 'B'
  },
  // +50-100 реальных примеров
];

// Агрегация данных для обучения
export function prepareTrainingData(matches) {
  const xs = [];
  const ys = [];

  matches.forEach(match => {
    // Нормализация коэффициентов
    const normA = normalizeOdds(match.oddsA);
    const normB = normalizeOdds(match.oddsB);
    
    // Комбинированные признаки
    xs.push([...normA, ...normB]); 
    ys.push(match.winner === 'A' ? 1 : 0);
  });

  return {
    xs: tf.tensor2d(xs),
    ys: tf.oneHot(tf.tensor1d(ys, 'int32'), 2)
  };
}

function normalizeOdds(odds) {
  const min = 1.0, max = 5.0;
  return odds.map(x => (max - x) / (max - min)); // Инвертируем и нормируем
}
