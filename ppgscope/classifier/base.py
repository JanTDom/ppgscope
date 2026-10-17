from abc import ABC, abstractmethod
from typing import List
from ppgscope.models.article import Article
from ppgscope.models.taxonomy import ClassificationResult


class BaseTopicClassifier(ABC):
    """
    Abstract interface for topic classification providers.
    Allows transparent swapping between rule-based, vector-embedding, and LLM implementations.
    """

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Version identifier of the underlying model or engine."""
        pass

    @property
    @abstractmethod
    def taxonomy_version(self) -> str:
        """Version of the taxonomy schema being used."""
        pass

    @abstractmethod
    def classify(self, article: Article) -> ClassificationResult:
        """
        Classifies an article into a primary topic, up to 2 secondary topics,
        with a confidence score and provenance metadata.
        """
        pass

    def classify_batch(self, articles: List[Article]) -> List[ClassificationResult]:
        """Classifies a batch of articles."""
        return [self.classify(a) for a in articles]
