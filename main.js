import { historicalMatches, prepareTrainingData } from './data.js';
import { createLSTMModel, createDenseModel, predictEnsemble } from './ensemble.js';

// Инициализация
async function init() {
  // Загрузка данных
  const { xs, ys } = prepareTrainingData(historicalMatches);
  
  // Создание ансамбля
  const models = [
    await createLSTMModel().fit(xs, ys, {epochs: 50}),
    await createDenseModel().fit(xs, ys, {epochs: 30})
  ];

  // Пример предсказания
  const testInput = tf.tensor2d([[
    ...normalizeOdds([1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 1.0, 1.0]),
    ...normalizeOdds([2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2])
  ]]);

  const [probA, probB] = await predictEnsemble(testInput, models);
  console.log(`Вероятность победы A: ${(probA * 100).toFixed(1)}%`);
}
