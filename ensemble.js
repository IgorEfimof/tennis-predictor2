import * as tf from '@tensorflow/tfjs';

// Разные архитектуры моделей
export function createLSTMModel() {
  const model = tf.sequential();
  model.add(tf.layers.lstm({units: 32, inputShape: [20, 1]}));
  model.add(tf.layers.dense({units: 2, activation: 'softmax'}));
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  return model;
}

export function createDenseModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({units: 64, inputShape: [20], activation: 'relu'}));
  model.add(tf.layers.dense({units: 2, activation: 'softmax'}));
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  return model;
}

// Ансамблевое предсказание
export async function predictEnsemble(input, models) {
  const predictions = await Promise.all(
    models.map(model => model.predict(input).data())
  );
  
  // Усреднение с весами
  const weights = [0.4, 0.6]; // Веса для каждой модели
  const weightedAvg = predictions
    .map((p, i) => p.map(v => v * weights[i]))
    .reduce((a, b) => a.map((v, i) => v + b[i]));

  return weightedAvg;
}
