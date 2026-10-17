from typing import List, Dict, Tuple
from pydantic import BaseModel
from ppgscope.models.article import Article
from ppgscope.classifier.base import BaseTopicClassifier


class BenchmarkItem(BaseModel):
    article: Article
    expected_primary_topic: str


class TopicMetrics(BaseModel):
    topic_id: str
    true_positives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0


class BenchmarkReport(BaseModel):
    total_evaluated: int
    overall_accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    topic_metrics: Dict[str, TopicMetrics]


class ClassifierBenchmark:
    """
    Evaluates topic classification quality on a reference gold standard dataset.
    Calculates precision, recall and F1 score per topic.
    """

    @classmethod
    def evaluate(cls, classifier: BaseTopicClassifier, gold_standard: List[BenchmarkItem]) -> BenchmarkReport:
        if not gold_standard:
            raise ValueError("Gold standard dataset cannot be empty")

        topics = set(item.expected_primary_topic for item in gold_standard)
        metrics: Dict[str, TopicMetrics] = {t: TopicMetrics(topic_id=t) for t in topics}

        correct = 0
        for item in gold_standard:
            result = classifier.classify(item.article)
            predicted = result.primary_topic
            expected = item.expected_primary_topic

            if predicted not in metrics:
                metrics[predicted] = TopicMetrics(topic_id=predicted)

            if predicted == expected:
                correct += 1
                metrics[expected].true_positives += 1
            else:
                metrics[predicted].false_positives += 1
                metrics[expected].false_negatives += 1

        # Calculate P, R, F1
        p_list, r_list, f1_list = [], [], []
        for m in metrics.values():
            denom_p = m.true_positives + m.false_positives
            m.precision = round(m.true_positives / denom_p, 4) if denom_p > 0 else 0.0

            denom_r = m.true_positives + m.false_negatives
            m.recall = round(m.true_positives / denom_r, 4) if denom_r > 0 else 0.0

            if (m.precision + m.recall) > 0:
                m.f1 = round(2 * (m.precision * m.recall) / (m.precision + m.recall), 4)
            else:
                m.f1 = 0.0

            p_list.append(m.precision)
            r_list.append(m.recall)
            f1_list.append(m.f1)

        accuracy = round(correct / len(gold_standard), 4)
        macro_p = round(sum(p_list) / len(p_list), 4) if p_list else 0.0
        macro_r = round(sum(r_list) / len(r_list), 4) if r_list else 0.0
        macro_f1 = round(sum(f1_list) / len(f1_list), 4) if f1_list else 0.0

        return BenchmarkReport(
            total_evaluated=len(gold_standard),
            overall_accuracy=accuracy,
            macro_precision=macro_p,
            macro_recall=macro_r,
            macro_f1=macro_f1,
            topic_metrics=metrics,
        )
