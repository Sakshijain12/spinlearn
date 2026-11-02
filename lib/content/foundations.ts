import type { LessonDraft } from "./types";

export const foundations: Record<string, LessonDraft> = {
  "softmax": {
    one_line: "Turn relative scores into a probability distribution without changing which score ranks highest.",
    steps: {
      concept: { body: "Softmax maps any finite vector of real scores, called logits, to positive values that sum to one. Increasing a logit increases its share relative to the others. Classifiers use it to predict mutually exclusive classes, and attention uses it to weight values. A high softmax score is not automatically a calibrated confidence: a model can be confidently wrong, particularly on unfamiliar inputs." },
      intuition: { body: "Imagine dividing a fixed attention budget among several candidates. Exponentiation rewards larger scores, and division by the total ensures all shares fit into the same budget. Adding the same number to every score does not change the shares. Temperature changes how concentrated the distribution is: a larger positive temperature makes it flatter." },
      math: {
        body: "For logit z_i and positive temperature T, normalize exp(z_i/T). To prevent overflow, first subtract the largest logit. This leaves every probability unchanged because the shared factor cancels between numerator and denominator.",
        formulas: ["p_i = \\frac{\\exp((z_i-m)/T)}{\\sum_j\\exp((z_j-m)/T)},\\qquad m=\\max_j z_j"],
        worked_example: "Logits [1, 2, 3] at temperature 1 give approximately [0.090, 0.245, 0.665]. Logits [1001, 1002, 1003] give exactly the same distribution in exact arithmetic.",
      },
      code: {
        language: "python",
        snippet: `from math import exp

def softmax(logits, temperature=1.0):
    if not logits or temperature <= 0:
        raise ValueError("Use nonempty logits and positive temperature")
    maximum = max(logits)
    weights = [exp((z - maximum) / temperature) for z in logits]
    return [w / sum(weights) for w in weights]

probabilities = softmax([1001, 1002, 1003])
print([round(p, 3) for p in probabilities])`,
        explanation: "Subtracting the maximum avoids exponentiating a very large positive number. The example uses only Python's standard library. Softmax normalizes scores; it does not verify whether those scores reflect reality.",
      },
    },
    quiz: [
      { id: "softmax-1", question: "What happens if 100 is added to every logit?", options: ["The probabilities do not change", "Every probability increases", "The largest class becomes certain"], correct_index: 0, explanation: "A shared exponential factor cancels during normalization, so only relative differences matter." },
      { id: "softmax-2", question: "Why subtract the maximum logit in an implementation?", options: ["To delete the largest class", "To reduce numerical overflow", "To make all outputs equal"], correct_index: 1, explanation: "The transformed exponents are nonpositive, avoiding enormous exponentials while preserving the distribution." },
      { id: "softmax-3", question: "Which statement about a 0.99 softmax score is correct?", options: ["The prediction must be true", "The input must match the training distribution", "It can still be an incorrect or poorly calibrated prediction"], correct_index: 2, explanation: "Normalization does not guarantee calibration or correctness on new data." },
    ],
    terms: {
      Logit: "An unnormalized real-valued score before a probability transformation.",
      Temperature: "A positive divisor applied to logits; higher values spread probability more evenly.",
      Calibration: "Agreement between predicted confidence and the observed frequency of correct outcomes.",
    },
    used_in: ["Multiclass classification", "Attention weights", "Token sampling"],
    go_deeper: { title: "Dive into Deep Learning: softmax regression", url: "https://d2l.ai/chapter_linear-classification/softmax-regression.html" },
  },
  "gradient-descent": {
    one_line: "Take repeated small steps opposite the loss gradient to improve the current parameters.",
    steps: {
      concept: { body: "Gradient descent is an optimization rule, not a model architecture. The gradient tells us the direction of steepest local increase in a differentiable loss. Moving in the opposite direction can reduce that loss if the step is appropriately sized. Full-batch descent uses all training examples; stochastic and mini-batch variants estimate the gradient from fewer examples. Neural-network losses are generally nonconvex, so convergence to a global optimum is not guaranteed." },
      intuition: { body: "Think of finding a lower point on a landscape using only the slope under your feet. Short steps are cautious but slow. Very long steps can jump over a valley and oscillate or diverge. The learning rate controls this step size. Noisy mini-batch slopes still contain useful direction, but the path need not decrease the full training loss at every update." },
      math: {
        body: "Update parameter vector theta by subtracting learning rate eta times the gradient. For the one-dimensional loss (w - 2)^2, the derivative is 2(w - 2); the unique minimum is w = 2.",
        formulas: ["\\theta_{t+1}=\\theta_t-\\eta\\nabla L(\\theta_t)", "L(w)=(w-2)^2,\\qquad \\frac{dL}{dw}=2(w-2)"],
        worked_example: "Starting at w = 4 with eta = 0.1 gives gradient 4 and next weight 3.6. The loss falls from 4 to 2.56.",
      },
      code: {
        language: "python",
        snippet: `weight = 4.0
learning_rate = 0.1
losses = []

for step in range(20):
    losses.append((weight - 2.0) ** 2)
    gradient = 2.0 * (weight - 2.0)
    weight -= learning_rate * gradient

print(round(weight, 4), round((weight - 2.0) ** 2, 6))`,
        explanation: "This deterministic scalar example isolates the update rule. In a neural network, automatic differentiation supplies one gradient per trainable parameter. The chosen learning rate is suitable for this quadratic, not a universal default.",
      },
    },
    quiz: [
      { id: "gd-1", question: "Which direction does plain gradient descent use?", options: ["Along the positive gradient", "Opposite the gradient", "Toward the largest weight"], correct_index: 1, explanation: "The gradient points toward local increase; descent subtracts a scaled gradient." },
      { id: "gd-2", question: "For (w - 2)^2 at w = 4, what is the derivative?", options: ["2", "8", "4"], correct_index: 2, explanation: "The derivative is 2(w - 2), which equals 4 at w = 4." },
      { id: "gd-3", question: "What can an excessively large learning rate cause?", options: ["Oscillation or divergence", "Guaranteed global convergence", "A zero gradient at every point"], correct_index: 0, explanation: "Large steps can overshoot low-loss regions and increase the loss instead of reducing it." },
    ],
    terms: {
      Gradient: "The vector of partial derivatives of a scalar objective with respect to its parameters.",
      "Learning rate": "The scale used to turn a gradient into an update.",
      "Mini-batch": "A subset of training examples used to estimate a gradient for one update.",
    },
    used_in: ["Neural-network training", "Linear regression", "Parameter estimation"],
    go_deeper: { title: "Dive into Deep Learning: gradient descent", url: "https://d2l.ai/chapter_optimization/gd.html" },
  },
  "overfitting": {
    one_line: "Training performance is useful only when the learned pattern also works on unseen data.",
    steps: {
      concept: { body: "Overfitting happens when a learner captures quirks or noise in its training sample rather than transferable structure. Training loss may keep falling while validation loss rises. A validation set helps choose capacity, regularization, and training duration; a separate test set estimates final performance. Splits must reflect deployment, such as holding out future time periods or entire users, to avoid leakage." },
      intuition: { body: "Memorizing practice questions can produce a perfect practice score without understanding the subject. A very flexible curve can pass through every noisy observation yet behave badly between observations. Simpler models, more representative data, regularization, and early stopping can help. A validation gap is a clue, not proof: distribution shift and noisy labels can also create a gap." },
      math: {
        body: "Compare average loss on training and held-out examples using the same loss function. Early stopping selects an earlier checkpoint based on validation loss, not the final test score. The gap below is an empirical diagnostic, not a guarantee of future error.",
        formulas: ["\\widehat L_D=\\frac{1}{|D|}\\sum_{(x,y)\\in D}\\ell(f_\\theta(x),y)", "g=\\widehat L_{\\mathrm{validation}}-\\widehat L_{\\mathrm{train}}"],
        worked_example: "At epoch 3, training loss is 0.12 and validation loss is 0.28. At epoch 5, they are 0.04 and 0.45. Epoch 3 is the better validation checkpoint despite its larger training loss.",
      },
      code: {
        language: "python",
        snippet: `train_loss = [0.50, 0.25, 0.12, 0.07, 0.04]
validation_loss = [0.55, 0.34, 0.28, 0.33, 0.45]

best_index = min(range(len(validation_loss)),
                 key=validation_loss.__getitem__)
best_epoch = best_index + 1
gap = validation_loss[best_index] - train_loss[best_index]
print("Restore epoch:", best_epoch)
print("Validation gap:", round(gap, 2))`,
        explanation: "The arrays stand in for logged losses, and the code selects a checkpoint. Real training must actually save and restore its parameter weights. Keep the final test set out of this selection process.",
      },
    },
    quiz: [
      { id: "overfit-1", question: "Which pattern is a common warning sign of overfitting?", options: ["Both losses are always zero", "Training loss rises while validation improves", "Training loss falls while validation loss worsens"], correct_index: 2, explanation: "The model may be fitting training-specific details rather than improving held-out performance." },
      { id: "overfit-2", question: "Which data should choose an early-stopping checkpoint?", options: ["Validation data", "The final test set on every epoch", "Only the training loss"], correct_index: 0, explanation: "Validation data supports model selection. Repeated test-set selection makes the test estimate optimistic." },
      { id: "overfit-3", question: "For forecasting, why can a random split be misleading?", options: ["It always creates class imbalance", "Future information may leak into training", "It changes the learning rate"], correct_index: 1, explanation: "Time-aware evaluation should mirror the order in which information is available at deployment." },
    ],
    terms: {
      Generalization: "Performance on unseen examples drawn from the intended deployment conditions.",
      "Early stopping": "Ending training or restoring an earlier checkpoint based on a held-out criterion.",
      "Data leakage": "Using information during training or selection that would not be available for a genuine prediction.",
    },
    used_in: ["Model selection", "Time-series forecasting", "Small-data learning"],
    go_deeper: { title: "Scikit-learn: learning curves and validation", url: "https://scikit-learn.org/stable/modules/learning_curve.html" },
  },
  "bias-variance-tradeoff": {
    one_line: "A model can be consistently wrong, overly sensitive to its training sample, or both.",
    steps: {
      concept: { body: "Bias describes systematic deviation of a learner's average prediction from the target function. Variance describes how its predictions change across different training samples. Under squared loss, expected prediction error can be decomposed into squared bias, variance, and irreducible noise. More flexibility often reduces bias while increasing variance, but modern models need not follow a simple monotonic curve." },
      intuition: { body: "Imagine training the same procedure on several independently collected datasets and asking each model about the same input. Tight predictions far from the true signal show high bias. Widely scattered predictions show high variance. Averaging diverse models can reduce variance, but it does not remove a systematic mistake shared by all of them." },
      math: {
        body: "The decomposition assumes squared error, a fixed input x, and expectations over training samples and observation noise. The noise term cannot be removed merely by choosing a more expressive function.",
        formulas: ["\\mathbb E[(Y-\\widehat f(x))^2]=\\operatorname{Bias}(x)^2+\\operatorname{Var}(\\widehat f(x))+\\sigma^2"],
        worked_example: "Two equally likely predictions are 1 and 3 while the noiseless target is 2. Their mean is 2, squared bias is 0, variance is 1, and mean squared error is 1.",
      },
      code: {
        language: "python",
        snippet: `predictions = [1.0, 3.0]
target = 2.0
mean_prediction = sum(predictions) / len(predictions)
bias_squared = (mean_prediction - target) ** 2
variance = sum((p - mean_prediction) ** 2
               for p in predictions) / len(predictions)
mse = sum((p - target) ** 2 for p in predictions) / len(predictions)
print(bias_squared, variance, mse)`,
        explanation: "This finite noiseless example illustrates the decomposition at one input. Each prediction represents a model fitted to a different training sample, not different inputs evaluated by the same model.",
      },
    },
    quiz: [
      { id: "bias-1", question: "In this decomposition, variance measures changes across what?", options: ["Different training samples", "Only class labels", "Only learning rates within one update"], correct_index: 0, explanation: "We consider how a training procedure's prediction at a fixed input varies when its training sample changes." },
      { id: "bias-2", question: "What is the squared bias of predictions 1 and 3 around target 2?", options: ["1", "0", "4"], correct_index: 1, explanation: "The average prediction is 2, so the difference from the target is zero." },
      { id: "bias-3", question: "Which error component remains even with the true conditional mean?", options: ["All variance from training", "A mandatory large bias", "Irreducible observation noise"], correct_index: 2, explanation: "Random variation in the outcome around its conditional mean cannot be predicted perfectly from the available input." },
    ],
    terms: {
      Bias: "The difference between the average fitted prediction and the target function at an input.",
      Variance: "The spread of fitted predictions across independently sampled training sets.",
      "Irreducible noise": "Outcome variation not explained by the available input features.",
    },
    used_in: ["Capacity selection", "Ensemble methods", "Error analysis"],
    go_deeper: { title: "Scikit-learn: bias-variance decomposition", url: "https://scikit-learn.org/stable/auto_examples/ensemble/plot_bias_variance.html" },
  },
  "cross-entropy-loss": {
    one_line: "Penalize a classifier when it assigns too little probability to the observed correct class.",
    steps: {
      concept: { body: "Cross-entropy compares a target distribution with a predicted probability distribution. For a one-hot class label, it is the negative log probability assigned to that class. It strongly penalizes confidently wrong predictions. In language modeling, averaging this loss over next-token targets trains the model to predict tokens in context. Lower loss on a representative held-out set is more informative than lower training loss alone." },
      intuition: { body: "If the correct answer receives probability 0.9, the penalty is small. If it receives 0.01, the penalty is much larger. The logarithm makes several independent predictions' probability products turn into a sum of losses. Probabilities near zero need stable numerical handling; taking log(0) directly is not a valid implementation." },
      math: {
        body: "For target probabilities y_i and model probabilities p_i, sum -y_i log(p_i). For logits z and correct class c, use log-sum-exp(z) - z_c rather than explicitly taking a log after an unstable softmax.",
        formulas: ["L=-\\sum_i y_i\\log p_i", "L=\\log\\sum_i e^{z_i}-z_c"],
        worked_example: "Giving the correct class probability 0.8 yields about 0.223 nats. Giving it 0.2 yields about 1.609 nats. The correct label's probability matters, not just whether it ranks first.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, log

logits = [1.0, 2.0, 3.0]
correct_class = 2
maximum = max(logits)
log_normalizer = maximum + log(sum(exp(z - maximum) for z in logits))
loss = log_normalizer - logits[correct_class]
print(round(loss, 6))`,
        explanation: "The stable log-sum-exp calculation avoids overflow. Libraries usually offer cross-entropy directly from logits, so do not apply softmax first unless the selected API explicitly expects probabilities.",
      },
    },
    quiz: [
      { id: "ce-1", question: "For a one-hot label, which probability determines the loss?", options: ["Only the largest incorrect probability", "The probability of the correct class", "The average of all probabilities"], correct_index: 1, explanation: "All one-hot target weights are zero except the correct class, giving -log(p_correct)." },
      { id: "ce-2", question: "What happens as the correct-class probability approaches zero?", options: ["Loss approaches zero", "Loss becomes negative", "Loss grows without bound"], correct_index: 2, explanation: "The negative logarithm tends to positive infinity as its argument tends to zero." },
      { id: "ce-3", question: "Which implementation is numerically safer for logits?", options: ["Stable log-sum-exp minus the correct logit", "Exponentiating huge logits directly", "Rounding probabilities to integers before the log"], correct_index: 0, explanation: "Subtracting a shared maximum inside log-sum-exp preserves the value while avoiding enormous exponentials." },
    ],
    terms: {
      "One-hot label": "A target vector with one at the correct class and zeros elsewhere.",
      "Log-sum-exp": "A stable way to compute the logarithm of a sum of exponentials.",
      Nat: "A unit of information obtained when using the natural logarithm.",
    },
    used_in: ["Classifier training", "Next-token prediction", "Probabilistic evaluation"],
    go_deeper: { title: "Dive into Deep Learning: cross-entropy in softmax regression", url: "https://d2l.ai/chapter_linear-classification/softmax-regression.html" },
  },
  "precision-and-recall": {
    one_line: "Precision asks whether positive predictions are right; recall asks whether real positives were found.",
    steps: {
      concept: { body: "Precision is the fraction of predicted positives that are truly positive. Recall is the fraction of actual positives that the model detects. Changing a decision threshold trades false positives against false negatives, although the exact curve depends on the scores. Accuracy can be misleading on heavily imbalanced data. Choose metrics based on the cost of each error and evaluate on representative examples." },
      intuition: { body: "A search system with high precision returns mostly relevant documents, but it may miss many useful ones. High recall means it finds most relevant documents, possibly mixed with irrelevant results. Neither metric alone answers every product question. F1 combines both with a harmonic mean, but it still does not encode every business cost." },
      math: {
        body: "TP counts true positives, FP false positives, and FN false negatives. Precision and recall are undefined when their denominators are zero; evaluation tools must state how they handle that case. The F1 expression below assumes a nonzero denominator.",
        formulas: ["P=\\frac{TP}{TP+FP},\\qquad R=\\frac{TP}{TP+FN}", "F_1=\\frac{2PR}{P+R}=\\frac{2TP}{2TP+FP+FN}"],
        worked_example: "With 2 true positives, 1 false positive, and 1 false negative, precision, recall, and F1 are all 2/3.",
      },
      code: {
        language: "python",
        snippet: `truth = [1, 0, 1, 1, 0]
predicted = [1, 1, 0, 1, 0]
tp = sum(y == 1 and p == 1 for y, p in zip(truth, predicted))
fp = sum(y == 0 and p == 1 for y, p in zip(truth, predicted))
fn = sum(y == 1 and p == 0 for y, p in zip(truth, predicted))
precision = tp / (tp + fp) if tp + fp else None
recall = tp / (tp + fn) if tp + fn else None
f1 = 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else None
print(precision, recall, f1)`,
        explanation: "The code explicitly uses None when a metric is undefined. These tiny lists illustrate binary evaluation; real evaluation should also report counts, class balance, threshold, and relevant subgroup results.",
      },
    },
    quiz: [
      { id: "pr-1", question: "A system predicts 10 positives and 8 are correct. What is precision?", options: ["10/8", "It cannot be calculated from these counts", "0.8"], correct_index: 2, explanation: "Precision divides true positives by all predicted positives: 8/10." },
      { id: "pr-2", question: "Which metric focuses on missed actual positives?", options: ["Recall", "Parameter count", "Training throughput"], correct_index: 0, explanation: "Recall is TP/(TP+FN), so false negatives reduce it." },
      { id: "pr-3", question: "Why report more than accuracy for a rare positive class?", options: ["Accuracy never uses labels", "Predicting every example as negative can look accurate", "Precision is always equal to accuracy"], correct_index: 1, explanation: "A majority-class predictor can achieve high accuracy while finding none of the rare positives." },
    ],
    terms: {
      "False positive": "An example predicted positive whose true label is negative.",
      "False negative": "A truly positive example that the model predicts negative.",
      "Decision threshold": "The score cutoff used to convert model scores into class decisions.",
    },
    used_in: ["Search evaluation", "Imbalanced classification", "Alerting systems"],
    go_deeper: { title: "Scikit-learn: precision, recall, and F-measures", url: "https://scikit-learn.org/stable/modules/model_evaluation.html#precision-recall-f-measure-metrics" },
  },
  "regularization": {
    one_line: "Prefer solutions that fit the data without relying on unnecessarily fragile parameter choices.",
    steps: {
      concept: { body: "Regularization changes the learning problem to encourage useful constraints or preferences. L2 penalties discourage large weights; L1 can encourage sparsity. Dropout, data augmentation, and early stopping also regularize learning in different ways. A stronger penalty can reduce overfitting, but too much causes underfitting. Tune its strength on validation data rather than assuming smaller weights always mean a better model." },
      intuition: { body: "Two models can explain the training data similarly while one uses extreme, finely balanced coefficients. A penalty can favor the less sensitive solution. It acts like a preference, not proof that the preferred solution is correct. Input scaling matters because penalizing coefficients measured on different scales can treat features unevenly." },
      math: {
        body: "Add lambda times the squared L2 norm to the data loss. With this convention, the penalty gradient is 2 lambda w. Weight decay is equivalent to this penalty for plain SGD under matching conventions, but decoupled weight decay in adaptive optimizers is not generally identical.",
        formulas: ["J(w)=L_{\\mathrm{data}}(w)+\\lambda\\lVert w\\rVert_2^2", "\\nabla J=\\nabla L_{\\mathrm{data}}+2\\lambda w"],
        worked_example: "For data loss (w - 1)^2, w = 3, lambda = 0.5, and learning rate 0.1, the total gradient is 4 + 3 = 7. The updated weight is 2.3.",
      },
      code: {
        language: "python",
        snippet: `weight = 3.0
target = 1.0
strength = 0.5
learning_rate = 0.1

data_gradient = 2 * (weight - target)
penalty_gradient = 2 * strength * weight
updated_weight = weight - learning_rate * (data_gradient + penalty_gradient)
print(round(updated_weight, 3))`,
        explanation: "This uses a scalar L2 penalty with an explicit convention, so its gradient matches the formula. Practical implementations often exclude biases or normalization parameters from weight decay.",
      },
    },
    quiz: [
      { id: "reg-1", question: "What can happen when regularization is too strong?", options: ["Underfitting", "Guaranteed perfect test accuracy", "The dataset becomes larger"], correct_index: 0, explanation: "An excessive constraint can prevent the model from capturing genuine structure." },
      { id: "reg-2", question: "What is the derivative of lambda times w squared?", options: ["lambda", "2 times lambda times w", "w squared"], correct_index: 1, explanation: "Differentiating lambda*w^2 gives 2*lambda*w with this penalty convention." },
      { id: "reg-3", question: "How should the penalty strength usually be selected?", options: ["By maximizing training accuracy only", "By repeatedly inspecting final test labels", "Using a validation procedure"], correct_index: 2, explanation: "Validation estimates how each strength generalizes while preserving an independent final test." },
    ],
    terms: {
      "L2 penalty": "A penalty proportional to the sum of squared parameter values.",
      "L1 penalty": "A penalty proportional to absolute parameter values that can encourage sparse solutions.",
      Underfitting: "Failing to capture useful structure because the model or learning procedure is too restrictive.",
    },
    used_in: ["Generalization control", "Linear models", "Neural-network training"],
    go_deeper: { title: "Dive into Deep Learning: weight decay", url: "https://d2l.ai/chapter_linear-regression/weight-decay.html" },
  },
};
