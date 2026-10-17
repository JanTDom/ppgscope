import re
from typing import Dict, List, Tuple
from ppgscope.models.article import Article
from ppgscope.models.taxonomy import ClassificationResult
from ppgscope.classifier.base import BaseTopicClassifier
from ppgscope.classifier.taxonomy import TaxonomyManager


class RuleBasedTopicClassifier(BaseTopicClassifier):
    """
    Deterministic rule and keyword-based topic classifier.
    Leverages editorial breadcrumbs, section markers, tags, headline terms, and keyword frequencies.
    Enforces mandatory INNE/NIEOKREŚLONE fallback when confidence is insufficient.
    """

    def __init__(self, taxonomy_manager: TaxonomyManager):
        self.taxonomy = taxonomy_manager
        self._model_version = "rule-engine-v1.0"

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def taxonomy_version(self) -> str:
        return self.taxonomy.version

    def _score_text(self, text: str, keywords: List[str]) -> int:
        if not text or not keywords:
            return 0
        clean = " " + re.sub(r"[^\w\s]", " ", text.lower()) + " "
        score = 0
        for kw in keywords:
            kw_clean = kw.lower()
            if f" {kw_clean} " in clean:
                score += 1
        return score

    def classify(self, article: Article) -> ClassificationResult:
        scores: Dict[str, float] = {tid: 0.0 for tid in self.taxonomy.list_topic_ids()}

        # 1. Section / Breadcrumb match (highest weight)
        if article.section:
            sec_lower = article.section.lower()
            for tid, tdef in self.taxonomy.topics.items():
                if tid == self.taxonomy.MANDATORY_FALLBACK:
                    continue
                # Exact or substring match in topic name or keywords
                if tdef.name.lower() in sec_lower or sec_lower in tdef.name.lower():
                    scores[tid] += 5.0
                elif any(kw.lower() in sec_lower for kw in tdef.keywords):
                    scores[tid] += 3.0

        # 2. Editorial tags match
        for tag in article.tags:
            tag_lower = tag.lower()
            for tid, tdef in self.taxonomy.topics.items():
                if tid == self.taxonomy.MANDATORY_FALLBACK:
                    continue
                if tag_lower in tdef.name.lower():
                    scores[tid] += 3.0
                elif any(kw.lower() == tag_lower for kw in tdef.keywords):
                    scores[tid] += 2.0

        # 3. Title keywords (weight = 3.0)
        for tid, tdef in self.taxonomy.topics.items():
            if tid == self.taxonomy.MANDATORY_FALLBACK:
                continue
            title_hits = self._score_text(article.title, tdef.keywords)
            scores[tid] += title_hits * 3.0

        # 4. Lead keywords (weight = 1.5)
        if article.lead:
            for tid, tdef in self.taxonomy.topics.items():
                if tid == self.taxonomy.MANDATORY_FALLBACK:
                    continue
                lead_hits = self._score_text(article.lead, tdef.keywords)
                scores[tid] += lead_hits * 1.5

        # 5. Body keywords (weight = 0.5, capped)
        if article.body:
            for tid, tdef in self.taxonomy.topics.items():
                if tid == self.taxonomy.MANDATORY_FALLBACK:
                    continue
                body_hits = self._score_text(article.body[:2000], tdef.keywords)
                scores[tid] += min(body_hits * 0.5, 5.0)

        # Remove fallback from ranking
        scores.pop(self.taxonomy.MANDATORY_FALLBACK, None)

        # Sort topics by score
        ranked: List[Tuple[str, float]] = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_topic, top_score = ranked[0] if ranked else (self.taxonomy.MANDATORY_FALLBACK, 0.0)

        # Calculate confidence
        if top_score <= 0.0:
            primary_topic = self.taxonomy.MANDATORY_FALLBACK
            confidence = 0.0
            secondary_topics = []
        else:
            # Normalize confidence: score 10.0+ corresponds to confidence ~0.9+
            confidence = min(round(top_score / (top_score + 3.0), 3), 1.0)
            
            if confidence < self.taxonomy.confidence_threshold:
                # Fails confidence threshold -> assign mandatory fallback
                primary_topic = self.taxonomy.MANDATORY_FALLBACK
                secondary_topics = []
            else:
                primary_topic = top_topic
                secondary_topics = []
                # Pick up to 2 secondary topics if their score is at least 30% of top score
                for cand_tid, cand_score in ranked[1:3]:
                    if cand_score >= 2.0 and (cand_score / top_score) >= 0.30:
                        secondary_topics.append(cand_tid)

        return ClassificationResult(
            canonical_url=article.canonical_url,
            primary_topic=primary_topic,
            secondary_topics=secondary_topics,
            confidence=confidence,
            model_version=self.model_version,
            prompt_version=None,
            taxonomy_version=self.taxonomy_version,
        )
